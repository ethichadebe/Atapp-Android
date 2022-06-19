package com.ethichadebe.atapp;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.lifecycle.ViewModelProvider;
import androidx.viewpager.widget.ViewPager;
import androidx.viewpager2.widget.CompositePageTransformer;
import androidx.viewpager2.widget.MarginPageTransformer;
import androidx.viewpager2.widget.ViewPager2;

import android.animation.ArgbEvaluator;
import android.animation.ValueAnimator;
import android.annotation.SuppressLint;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.TransitionDrawable;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieProperty;
import com.airbnb.lottie.model.KeyPath;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.ethichadebe.atapp.Adapter.ArtSliderAdapter;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";

    private CoordinatorLayout clFirstBackground;

    private LottieAnimationView animationView;

    private TabLayout tlLayout;
    private ViewPager2 view_pager;
    private ArtSliderAdapter adapter;

    private ArtViewModel artViewModel;
    private BottomSheetBehavior mBehavior;
    private View bottomSheet;
    private TextView tvTitle, tvDescription, tvSmartifyLink, tvArtist;

    private int prevPosition = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        DisplayMetrics displayMetrics = new DisplayMetrics();
        getWindowManager().getDefaultDisplay().getMetrics(displayMetrics);
        int screenHeight = displayMetrics.heightPixels;

        clFirstBackground = findViewById(R.id.clFirstBackground);

        tlLayout = findViewById(R.id.tlLayout);
        view_pager = findViewById(R.id.view_pager);


        tvArtist = findViewById(R.id.tvArtist);
        tvTitle = findViewById(R.id.tvTitle);
        tvDescription = findViewById(R.id.tvDescription);
        tvSmartifyLink = findViewById(R.id.tvSmartifyLink);

        tvDescription.setMovementMethod(new ScrollingMovementMethod());
        bottomSheet = findViewById(R.id.rlBottomSheet);

        animationView = findViewById(R.id.animationView);
        animationView.setMinAndMaxProgress(0.0f, 0.5f);

        animationView.playAnimation();

        mBehavior = BottomSheetBehavior.from(bottomSheet);
        mBehavior.setPeekHeight(screenHeight / 5, true);

        artViewModel = new ViewModelProvider(this).get(ArtViewModel.class);

        artViewModel.getArt().observe(this, arts -> {
            if (arts != null) {
                adapter = new ArtSliderAdapter(arts.toArray(new Art[0]), getApplicationContext());
                view_pager.setClipToPadding(false);
                view_pager.setClipChildren(false);
                view_pager.setOffscreenPageLimit(3);
                view_pager.getChildAt(0).setOverScrollMode(View.OVER_SCROLL_NEVER);
                view_pager.setAdapter(adapter);

                CompositePageTransformer transformer = new CompositePageTransformer();
                transformer.addTransformer(new MarginPageTransformer(8));
                transformer.addTransformer((page, position) -> {
                    float v = 1 - Math.abs(position);
                    page.setScaleY(0.8f + v * 0.2f);
                    Log.d(TAG, "transformPage: " + position);

                });
                view_pager.setPageTransformer(transformer);
            }

            TabLayoutMediator tabLayoutMediator = new TabLayoutMediator(tlLayout, view_pager, true, new TabLayoutMediator.TabConfigurationStrategy() {
                @Override
                public void onConfigureTab(@NonNull TabLayout.Tab tab, int position) {

                }
            });

            tabLayoutMediator.attach();


            view_pager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
                @SuppressLint("Recycle")
                @Override
                public void onPageSelected(int position) {
                    if ((prevPosition != position)) {
                        //Set Muted Transition
                        ColorDrawable[] backgroundDrawables = new ColorDrawable[2];
                        ValueAnimator foregroundValueAnimator= ValueAnimator.ofObject(new ArgbEvaluator(),
                                Color.rgb(extractColors(arts.get(Math.round(prevPosition)).getMuted())[0],
                                        extractColors(arts.get(Math.round(prevPosition)).getMuted())[1],
                                        extractColors(arts.get(Math.round(prevPosition)).getMuted())[2]),
                                Color.rgb(extractColors(arts.get(Math.round(position)).getMuted())[0],
                                        extractColors(arts.get(Math.round(position)).getMuted())[1],
                                        extractColors(arts.get(Math.round(position)).getMuted())[2]));;
                        int currentNightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
                        switch (currentNightMode) {
                            case Configuration.UI_MODE_NIGHT_NO:
                                // Night mode is not active, we're in day time
                                backgroundDrawables[0] = new ColorDrawable(Color.rgb(extractColors(arts.get(Math.round(prevPosition)).getVibrant())[0],
                                        extractColors(arts.get(Math.round(prevPosition)).getVibrant())[1],
                                        extractColors(arts.get(Math.round(prevPosition)).getVibrant())[2]));
                                backgroundDrawables[1] = new ColorDrawable(Color.rgb(extractColors(arts.get(Math.round(position)).getVibrant())[0],
                                        extractColors(arts.get(Math.round(position)).getVibrant())[1],
                                        extractColors(arts.get(Math.round(position)).getVibrant())[2]));

                                foregroundValueAnimator = ValueAnimator.ofObject(new ArgbEvaluator(),
                                        Color.rgb(extractColors(arts.get(Math.round(prevPosition)).getMuted())[0],
                                                extractColors(arts.get(Math.round(prevPosition)).getMuted())[1],
                                                extractColors(arts.get(Math.round(prevPosition)).getMuted())[2]), Color.rgb(extractColors(arts.get(Math.round(position)).getMuted())[0],
                                                extractColors(arts.get(Math.round(position)).getMuted())[1],
                                                extractColors(arts.get(Math.round(position)).getMuted())[2]));
                                break;
                            case Configuration.UI_MODE_NIGHT_YES:
                            case Configuration.UI_MODE_NIGHT_UNDEFINED:
                                // Night mode is active, we're at night!
                                backgroundDrawables[0] = new ColorDrawable(Color.rgb(extractColors(arts.get(Math.round(prevPosition)).getMuted())[0],
                                        extractColors(arts.get(Math.round(prevPosition)).getMuted())[1],
                                        extractColors(arts.get(Math.round(prevPosition)).getMuted())[2]));
                                backgroundDrawables[1] = new ColorDrawable(Color.rgb(extractColors(arts.get(Math.round(position)).getMuted())[0],
                                        extractColors(arts.get(Math.round(position)).getMuted())[1],
                                        extractColors(arts.get(Math.round(position)).getMuted())[2]));

                                foregroundValueAnimator = ValueAnimator.ofObject(new ArgbEvaluator(),
                                        Color.rgb(extractColors(arts.get(Math.round(prevPosition)).getVibrant())[0],
                                                extractColors(arts.get(Math.round(prevPosition)).getVibrant())[1],
                                                extractColors(arts.get(Math.round(prevPosition)).getVibrant())[2]),
                                        Color.rgb(extractColors(arts.get(Math.round(position)).getVibrant())[0],
                                                extractColors(arts.get(Math.round(position)).getVibrant())[1],
                                                extractColors(arts.get(Math.round(position)).getVibrant())[2]));
                                break;
                        }
                        TransitionDrawable backgroundTransition = new TransitionDrawable(backgroundDrawables);
                        TransitionDrawable backgroundTransition1 = new TransitionDrawable(backgroundDrawables);
                        bottomSheet.setBackground(backgroundTransition);
                        clFirstBackground.setBackground(backgroundTransition1);

                        foregroundValueAnimator.addUpdateListener(valueAnimator -> {
                            tvTitle.setTextColor((Integer) valueAnimator.getAnimatedValue());
                            tvArtist.setTextColor((Integer) valueAnimator.getAnimatedValue());
                            tvDescription.setTextColor((Integer) valueAnimator.getAnimatedValue());
                            tvSmartifyLink.setTextColor((Integer) valueAnimator.getAnimatedValue());
                        });


                        tvTitle.setText(arts.get(Math.round(position)).getTitle());
                        tvArtist.setText(arts.get(Math.round(position)).getArtist());
                        tvDescription.setText(arts.get(Math.round(position)).getDescription());
                        tvSmartifyLink.setText("Read more on SMARTIFY..org");


                        backgroundTransition.startTransition(1000);
                        backgroundTransition1.startTransition(1000);
                        foregroundValueAnimator.setDuration(1000);

                        prevPosition = position;
                    }

                    mBehavior.addBottomSheetCallback(new BottomSheetBehavior.BottomSheetCallback() {
                        @Override
                        public void onStateChanged(@NonNull View bottomSheet, int newState) {
                            if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                                animationView.setMinAndMaxProgress(0.5f, 1.0f);
                            } else {
                                animationView.setMinAndMaxProgress(0.0f, 0.5f);
                            }
                            animationView.playAnimation();
                        }

                        @Override
                        public void onSlide(@NonNull View bottomSheet, float slideOffset) {

                        }
                    });

                    animationView.setOnClickListener(view -> {
                        if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                            mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
                        } else if (mBehavior.getState() == BottomSheetBehavior.STATE_COLLAPSED) {
                            mBehavior.setState(BottomSheetBehavior.STATE_EXPANDED);
                        }
                    });
                }
            });
        });

    }


    private int[] extractColors(String rgb) {
        int[] colorRGB = new int[3];

        String[] rgbValues = rgb.split(",");

        colorRGB[0] = (int) Double.parseDouble(rgbValues[0]);
        colorRGB[1] = (int) Double.parseDouble(rgbValues[1]);
        colorRGB[2] = (int) Double.parseDouble(rgbValues[2]);

        return colorRGB;
    }


    private int dpToPx(int dp) {
        float density = getApplicationContext().getResources().getDisplayMetrics().density;
        return Math.round((float) dp * density);
    }

    @Override
    public void onBackPressed() {

        finishAffinity();
    }
}

