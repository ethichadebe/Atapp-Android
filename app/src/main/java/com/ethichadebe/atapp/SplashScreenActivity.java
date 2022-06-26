package com.ethichadebe.atapp;

import static com.ethichadebe.atapp.Util.Util.todaysDate;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.RelativeLayout;

import com.airbnb.lottie.LottieAnimationView;
import com.ethichadebe.atapp.ViewModel.ArtViewModel;

public class SplashScreenActivity extends AppCompatActivity {
    public static final String SHARED_PREFS = "SHAREDpREFS";
    public static final String SAVED_DATE = "SavedDate";

    private RelativeLayout rlBody;
    private Animation zoom;
    private ImageView img, ivMyLogo;

    private ArtViewModel artViewModel;


    private LottieAnimationView lavLoader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash_screen);

        rlBody = findViewById(R.id.rlBody);
        img = findViewById(R.id.ivBackground);
        ivMyLogo = findViewById(R.id.ivMyLogo);
        lavLoader = findViewById(R.id.lavLoader);

        int currentNightMode = getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;

        switch (currentNightMode) {
            case Configuration.UI_MODE_NIGHT_NO:
                // Night mode is not active, we're in day time
                ivMyLogo.setImageResource(R.drawable.blacklogo);
                rlBody.setBackgroundColor(getResources().getColor(R.color.white));
                break;
            case Configuration.UI_MODE_NIGHT_YES:
            case Configuration.UI_MODE_NIGHT_UNDEFINED:
                // Night mode is active, we're at night!
                ivMyLogo.setImageResource(R.drawable.whitelogo);
                rlBody.setBackgroundColor(getResources().getColor(R.color.black));
                break;
        }

        artViewModel = new ViewModelProvider(this).get(ArtViewModel.class);

        //Check if date has changed
        SharedPreferences sharedPreferences = getSharedPreferences(SHARED_PREFS, MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPreferences.edit();
        if (sharedPreferences.getString(SAVED_DATE, "").isEmpty()) {
            editor.putString(SAVED_DATE, todaysDate());
        } else if (!sharedPreferences.getString(SAVED_DATE, "").equals(todaysDate())) {
            artViewModel.getArt().observe(this, arts -> {
                for (Art art : arts.toArray(new Art[0])){
                    artViewModel.delete(art);
                }

            });
        }

        //Request for more art from the remote database
        if (artViewModel.moreArtNeeded()) {
            artViewModel.makeAPICall();
        }


        getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        lavLoader.setMinAndMaxFrame(0, 180);

        zoom = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.zoom);
        zoom.setDuration(3000);
        img.startAnimation(zoom);

        Handler h = new Handler();

        h.postDelayed(new Runnable() {
            @Override
            public void run() {
                startActivity(new Intent(getApplicationContext(), MainActivity.class));
            }
        }, 4000);
    }


    @Override
    public void onBackPressed() {
        artViewModel.cancelCall();
        finishAffinity();
    }
}