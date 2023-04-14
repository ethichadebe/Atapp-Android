package com.ethichadebe.atapp;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.TransitionDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.text.method.ScrollingMovementMethod;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewpager2.widget.CompositePageTransformer;
import androidx.viewpager2.widget.MarginPageTransformer;
import androidx.viewpager2.widget.ViewPager2;

import com.airbnb.lottie.LottieAnimationView;
import com.airbnb.lottie.LottieProperty;
import com.airbnb.lottie.model.KeyPath;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.ethichadebe.atapp.Adapter.ArtSliderAdapter;
import com.ethichadebe.atapp.ViewModel.ArtViewModel;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;

import java.util.List;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";

    private CoordinatorLayout clFirstBackground;

    private LottieAnimationView animationView, lavLoader;

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

        lavLoader = findViewById(R.id.lavLoader);
        animationView = findViewById(R.id.animationView);
        animationView.setMinAndMaxProgress(0.0f, 0.5f);

        animationView.playAnimation();

        mBehavior = BottomSheetBehavior.from(bottomSheet);
        mBehavior.setPeekHeight(screenHeight / 5, true);

        artViewModel = new ViewModelProvider(this).get(ArtViewModel.class);

        artViewModel.getLocalData().observe(this, arts -> {

            if (arts!=null){
                adapter = new ArtSliderAdapter(arts.toArray(new Art[0]),MainActivity.this,MainActivity.this);
                view_pager.setAdapter(adapter);
                view_pager.setOffscreenPageLimit(10);
                view_pager.setClipChildren(false);
                view_pager.setClipToPadding(false);

                view_pager.getChildAt(0).setOverScrollMode(RecyclerView.OVER_SCROLL_NEVER);

                CompositePageTransformer transformer = new CompositePageTransformer();
                transformer.addTransformer(new MarginPageTransformer(40));
                transformer.addTransformer((page, position) -> {
                    float r = 1 - Math.abs(position);
                    page.setScaleY(0.86f+r*0.14f);
                });

                view_pager.setPageTransformer(transformer);
            }
        });

        artViewModel.getPreloadImages().observe(this, arts -> {
            if (arts.size() > 0) {
                preLoadImages(arts);
            }
        });
    }

    private void preLoadImages(@NonNull List<Art> arts) {
        Art art = arts.remove(0);

        Glide
                .with(getApplicationContext())
                .load(art.getImage())
                .preload();

        if (arts.size() > 0) {
            preLoadImages(arts);
        }
    }

    private void setupDisplay(@NonNull List<Art> arts, int position) {
        Art art = arts.get(position);

        Log.d(TAG, "setupDisplay: Art info:\nTitle: " + art.getTitle() + "\nArtist: " + art.getArtist() + "\nDescription: " + art.getDescription() +
                "\nImage: " + art.getImage() + "\nVibrant color: " + art.getVibrant() + "\nMuted color: " + art.getMuted());
        int currentNightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        switch (currentNightMode) {
            case Configuration.UI_MODE_NIGHT_NO:
                // Night mode is not active, we're in day time
                setForeGround(art, art.getMuted());
                setBackground(arts.get(prevPosition).getVibrant(), art.getVibrant());

                break;
            case Configuration.UI_MODE_NIGHT_YES:
            case Configuration.UI_MODE_NIGHT_UNDEFINED:
                // Night mode is active, we're at night!
                setForeGround(art, art.getVibrant());
                setBackground(arts.get(prevPosition).getMuted(), art.getMuted());
                break;
        }

        //adapter.reDisplayItem(position);
    }

    private void setForeGround(@NonNull Art art, String strColor) {
        int color = Color.rgb(extractColors(strColor)[0],
                extractColors(strColor)[1],
                extractColors(strColor)[2]);

        tvTitle.setTextColor(color);
        tvArtist.setTextColor(color);
        tvDescription.setTextColor(color);
        tvSmartifyLink.setTextColor(color);
        animationView.addValueCallback(
                new KeyPath("**"),
                LottieProperty.COLOR_FILTER,
                frameInfo -> new PorterDuffColorFilter(color, PorterDuff.Mode.SRC_ATOP)
        );
        tlLayout.setSelectedTabIndicatorColor(color);

        tvTitle.setText(art.getTitle());
        tvArtist.setText(art.getArtist());
        tvDescription.setText(art.getDescription());
        tvSmartifyLink.setText("Read more on SMARTIFY..org");
    }

    private void setBackground(String prevColor, String color) {
        ColorDrawable[] backgroundDrawables = new ColorDrawable[2];

        backgroundDrawables[0] = new ColorDrawable(Color.rgb(extractColors(prevColor)[0], extractColors(prevColor)[1], extractColors(prevColor)[2]));
        backgroundDrawables[1] = new ColorDrawable(Color.rgb(extractColors(color)[0], extractColors(color)[1], extractColors(color)[2]));

        TransitionDrawable backgroundTransition = new TransitionDrawable(backgroundDrawables);
        TransitionDrawable backgroundTransition1 = new TransitionDrawable(backgroundDrawables);

        bottomSheet.setBackground(backgroundTransition);
        clFirstBackground.setBackground(backgroundTransition1);

        backgroundTransition.startTransition(1000);
        backgroundTransition1.startTransition(1000);
    }

    @NonNull
    private int[] extractColors(@NonNull String rgb) {
        int[] colorRGB = new int[3];

        String[] rgbValues = rgb.split(",");

        colorRGB[0] = (int) Double.parseDouble(rgbValues[0]);
        colorRGB[1] = (int) Double.parseDouble(rgbValues[1]);
        colorRGB[2] = (int) Double.parseDouble(rgbValues[2]);

        return colorRGB;
    }

    @Override
    public void onBackPressed() {
        if (mBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
            mBehavior.setState(BottomSheetBehavior.STATE_COLLAPSED);
        } else {
            finishAffinity();
        }

    }
}

