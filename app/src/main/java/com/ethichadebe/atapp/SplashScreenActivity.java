package com.ethichadebe.atapp;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.RelativeLayout;

import com.airbnb.lottie.LottieAnimationView;

public class SplashScreenActivity extends AppCompatActivity {


    private RelativeLayout rlBody;
    private Animation zoom;
    private ImageView img;

    private ArtViewModel artViewModel;


    private LottieAnimationView lavLoader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash_screen);

        rlBody = findViewById(R.id.rlBody);
        img = findViewById(R.id.ivBackground);
        lavLoader = findViewById(R.id.lavLoader);

        int currentNightMode = getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;
        switch (currentNightMode) {
            case Configuration.UI_MODE_NIGHT_NO:
                // Night mode is not active, we're in day time
                rlBody.setBackgroundColor(getResources().getColor(R.color.white));
                break;
            case Configuration.UI_MODE_NIGHT_YES:
            case Configuration.UI_MODE_NIGHT_UNDEFINED:
                // Night mode is active, we're at night!
                rlBody.setBackgroundColor(getResources().getColor(R.color.black));
                break;
        }

        artViewModel = new ViewModelProvider(this).get(ArtViewModel.class);

        artViewModel.makeAPICall();


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