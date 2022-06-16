package com.ethichadebe.atapp;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "art_gallery")
public class Art {
    @PrimaryKey
    @NonNull
    private String link;
    private String random_word;
    private String image;
    private String title;
    private String size;
    private String artist;
    private String description;
    private String vibrant;
    private String muted;
    private String used;

    public Art(String link, String random_word, String image, String title, String size, String artist, String description, String vibrant, String muted, String used) {
        this.link = link;
        this.random_word = random_word;
        this.image = image;
        this.title = title;
        this.size = size;
        this.artist = artist;
        this.description = description;
        this.vibrant = vibrant;
        this.muted = muted;
        this.used = used;
    }

    public String getLink() {
        return link;
    }

    public String getRandom_word() {
        return random_word;
    }

    public String getImage() {
        return image;
    }

    public String getTitle() {
        return title;
    }

    public String getSize() {
        return size;
    }

    public String getArtist() {
        return artist;
    }

    public String getDescription() {
        return description;
    }

    public String getVibrant() {
        return vibrant;
    }

    public String getMuted() {
        return muted;
    }

    public String getUsed() {
        return used;
    }
}
