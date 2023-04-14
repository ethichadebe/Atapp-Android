package com.ethichadebe.atapp;

import static com.ethichadebe.atapp.Util.Util.SAVED_DATE;
import static com.ethichadebe.atapp.Util.Util.SHARED_PREFS;
import static com.ethichadebe.atapp.Util.Util.currentTime;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.AsyncTask;
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
import com.ethichadebe.atapp.Util.Util;
import com.ethichadebe.atapp.ViewModel.ArtViewModel;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

public class SplashScreenActivity extends AppCompatActivity {
    private static final String TAG = "SplashScreenActivity";

    private ArrayList<Art> items;
    private RelativeLayout rlBody;
    private Animation zoom;
    private ImageView img, ivMyLogo;

    private ArtViewModel artViewModel;
    private Scraper scraper = new Scraper();


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash_screen);

        scraper.execute();
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

        Log.d(TAG, "onCreate:\ncurrent time " + currentTime() + " saved time: " + sharedPreferences.getString(SAVED_DATE, ""));
        if (sharedPreferences.getString(SAVED_DATE, "").isEmpty()) {
            Log.d(TAG, "onCreate: empty");
            scraper.execute();
            editor.putString(SAVED_DATE, currentTime());
            editor.apply();
        } else if (!sharedPreferences.getString(SAVED_DATE, "").equals(currentTime())) {
            List<Art> artToDelete = artViewModel.getArtToDelete();

            for (Art art : artToDelete) {
                Log.d(TAG, "onCreate: delete " + art.getTitle());
                artViewModel.delete(art);
            }
        }

        //Request for more art from the remote database
       /* if (artViewModel.moreArtNeeded()) {
            scraper.execute();
        }*/


        getWindow().setFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        lavLoader.setMinAndMaxFrame(0, 180);

        zoom = AnimationUtils.loadAnimation(getApplicationContext(), R.anim.zoom);
        zoom.setDuration(3000);
        img.startAnimation(zoom);

    }

    class Scraper extends AsyncTask<Void, Void, Void> {

        @Override
        protected void onPostExecute(Void unused) {
            startActivity(new Intent(getApplicationContext(), MainActivity.class));
            super.onPostExecute(unused);
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }

        @Override
        protected void onCancelled(Void unused) {
            super.onCancelled(unused);
        }

        @Override
        protected Void doInBackground(Void... voids) {
            scrapeData();
            return null;
        }
    }

    private void scrapeData() {
        int randomNum = ThreadLocalRandom.current().nextInt(1, 76413 + 1);
        items = new ArrayList<>();
        try {
            Log.d(TAG, "doInBackground: Random number: " + randomNum);

            Document document = Jsoup.connect("https://www.nga.gov/collection/art-object-page." + randomNum + ".html").get();

            Elements data = document.select("div.section-row");

            if (data.select("span.object-image-helper").select("img").eq(0).attr("src")
                    .equals("/content/dam/ngaweb/placeholders/placeholder-lg.svg")){
                scrapeData();
            }else {
                Log.d(TAG, "doInBackground: size " + data);

                String link = "https://www.nga.gov/collection/art-object-page." + randomNum + ".html";
                String image = data.select("span.object-image-helper").select("img").eq(0).attr("src");
                String title = data.select("div.section-col").select("h1.object-title").eq(0).text();
                String size = data.select("div.dimensions").select("p.object-attr-value").eq(0).text();
                String artist = data.select("div.artists-makers").select("p.object-attr-value").eq(0).text();

                Log.d(TAG, "doInBackground: Results----------------------------------------------------------------------------------");
                Log.d(TAG, "doInBackground: link: " + link);
                Log.d(TAG, "doInBackground: image: " + image);
                Log.d(TAG, "doInBackground: title: " + title);
                Log.d(TAG, "doInBackground: size: " + size);
                Log.d(TAG, "doInBackground: artist: " + artist);
                Log.d(TAG, "doInBackground: Results-----------------------------------------------------------------------------------");

                items.add(new Art(link,image,title,size,artist,"",))
            }

                    /*items.add(new Art(name, Double.parseDouble(price.replaceAll("[^\\d.]", "")),
                            image, getIntent().getIntExtra("sID", 0)));
                    groceryItemAdapter.setGroceryItemSearchAdapter(CircularShopActivity.this, items);*/
        } catch (IOException e) {
            Log.e(TAG, "doInBackground: error " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @Override
    public void onBackPressed() {
        //artViewModel.cancelCall();
        finishAffinity();
    }
}