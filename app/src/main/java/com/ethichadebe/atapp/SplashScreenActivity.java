package com.ethichadebe.atapp;

import static com.ethichadebe.atapp.Util.Util.SAVED_DATE;
import static com.ethichadebe.atapp.Util.Util.SHARED_PREFS;
import static com.ethichadebe.atapp.Util.Util.currentTime;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.ViewModelProvider;

import com.airbnb.lottie.LottieAnimationView;
import com.ethichadebe.atapp.ViewModel.ArtViewModel;

import java.util.List;

public class SplashScreenActivity extends AppCompatActivity {
    private static final String TAG = "SplashScreenActivity";

    private RelativeLayout rlBody;
    private Animation zoom;
    private ImageView img, ivMyLogo;

    private ArtViewModel artViewModel;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash_screen);

        rlBody = findViewById(R.id.rlBody);
        img = findViewById(R.id.ivBackground);
        ivMyLogo = findViewById(R.id.ivMyLogo);
        LottieAnimationView lavLoader = findViewById(R.id.lavLoader);

        int currentNightMode = getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;

        switch (currentNightMode) {
            case Configuration.UI_MODE_NIGHT_NO:
                // Night mode is not active, we're in day time
                ivMyLogo.setImageResource(R.drawable.blacklogo);
                rlBody.setBackgroundColor(ContextCompat.getColor(getApplicationContext(), R.color.white));
                break;
            case Configuration.UI_MODE_NIGHT_YES:
            case Configuration.UI_MODE_NIGHT_UNDEFINED:
                // Night mode is active, we're at night!
                ivMyLogo.setImageResource(R.drawable.whitelogo);
                rlBody.setBackgroundColor(ContextCompat.getColor(getApplicationContext(), R.color.black));
                break;
        }

        artViewModel = new ViewModelProvider(this).get(ArtViewModel.class);

        //Check if date has changed
        SharedPreferences sharedPreferences = this.getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();

        Log.d(TAG, "onCreate:\ncurrent time " + currentTime() +" saved time: "+ sharedPreferences.getString(SAVED_DATE, ""));
        if (sharedPreferences.getString(SAVED_DATE, "").isEmpty()) {
            Log.d(TAG, "onCreate: empty");
            getRemoteData();
            editor.putString(SAVED_DATE, currentTime());
            editor.apply();
        } else if (!sharedPreferences.getString(SAVED_DATE, "").equals(currentTime())) {
            List<Art> artToDelete = artViewModel.getArtToDelete();

            for (Art art: artToDelete){
                Log.d(TAG, "onCreate: delete " + art.getTitle());
                artViewModel.delete(art);
            }
        }

        //Request for more art from the remote database
        if (artViewModel.moreArtNeeded()) {
            getRemoteData();
        }


        getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        lavLoader.setMinAndMaxFrame(0, 180);

        zoom = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.zoom);
        zoom.setDuration(3000);
        img.startAnimation(zoom);

        Handler h = new Handler();

        h.postDelayed(() -> startActivity(new Intent(getApplicationContext(), MainActivity.class)), 4000);

    }

    private void getRemoteData(){
        artViewModel.getRemoteData().observe(this, apiResponse -> {
            if (apiResponse == null) {
                // handle error here
                return;
            }
            if (apiResponse.getError() == null) {
                // call is successful
                Log.i(TAG, "Data response is " + apiResponse.getPosts());
            } else {
                // call failed.
                Throwable e = apiResponse.getError();
                Toast.makeText(SplashScreenActivity.this, "Error is " + e.getMessage(), Toast.LENGTH_SHORT).show();
                Log.e(TAG, "Error is " + e.getLocalizedMessage());

            }
        });
    }

    @Override
    public void onBackPressed() {
        //artViewModel.cancelCall();
        finishAffinity();
    }
}