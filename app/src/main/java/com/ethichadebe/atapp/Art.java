package com.ethichadebe.atapp;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "art_gallery")
public class Art {
    @PrimaryKey(autoGenerate = true)
    @NonNull
    private int artId;
    private String link;
    private String image;
    private String title;
    private String size;
    private String artist;
    private String description;
    private String vibrant;
    private String muted;
    private String used;

    public Art(@NonNull int artId, String link, String image, String title, String size, String artist, String description, String vibrant, String muted, String used) {
        this.artId = artId;
        this.link = link;
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

    public int getArtId() {
        return artId;
    }

    public void setArtId(int artId) {
        this.artId = artId;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public void setArtist(String artist) {
        this.artist = artist;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setVibrant(String vibrant) {
        this.vibrant = vibrant;
    }

    public void setMuted(String muted) {
        this.muted = muted;
    }

    public void setUsed(String used) {
        this.used = used;
    }
}
