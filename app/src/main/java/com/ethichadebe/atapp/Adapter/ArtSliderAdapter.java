package com.ethichadebe.atapp.Adapter;

import android.app.Activity;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import com.ablanco.zoomy.Zoomy;
import com.airbnb.lottie.LottieAnimationView;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.R;

public class ArtSliderAdapter extends RecyclerView.Adapter<ArtSliderAdapter.ViewHolder> {
    private static final String TAG = "ArtSliderAdapter";
    private Art[] images;
    private Context context;
    private Activity activity;

    private ImageView ivArt;
    private LottieAnimationView lavLoader;

    public ArtSliderAdapter(Art[] images, Context context, Activity activity) {
        this.images = images;
        this.context = context;
        this.activity = activity;
    }

    @NonNull
    @Override
    public ArtSliderAdapter.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.art_item, parent, false);

        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ArtSliderAdapter.ViewHolder holder, int position) {
        Glide
                .with(context)
                .load(images[position].getImage())
                .listener(new RequestListener<Drawable>() {
                    @Override
                    public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        return false;
                    }

                    @Override
                    public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        lavLoader.setVisibility(View.GONE);
                        return false;
                    }
                })
                .override(2000, 2000)
                .into(ivArt);

        Zoomy.Builder builder = new Zoomy.Builder(activity).target(ivArt);
        builder.register();


    }

    @Override
    public int getItemCount() {
        return images.length;
    }

    public class ViewHolder extends RecyclerView.ViewHolder {

        public ViewHolder(@NonNull View itemView) {
            super(itemView);

            ivArt = itemView.findViewById(R.id.ivArt);
            lavLoader = itemView.findViewById(R.id.lavLoader);
        }
    }
}