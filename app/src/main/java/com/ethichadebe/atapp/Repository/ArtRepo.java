package com.ethichadebe.atapp.Repository;

import android.app.Application;
import android.util.Log;

import androidx.lifecycle.LiveData;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.AsyncTasks.DeleteArtAsyncTask;
import com.ethichadebe.atapp.AsyncTasks.InsertArtAsyncTask;
import com.ethichadebe.atapp.Local.ArtDao;
import com.ethichadebe.atapp.Local.ArtDatabase;

import java.util.List;

public class ArtRepo {
    private static final String TAG = "ArtRepo";

    private final ArtDao artDao;

    private final LiveData<List<Art>> art;
    private final LiveData<List<Art>> images;
    private final int nItems;

    public ArtRepo(Application application) {
        ArtDatabase database = ArtDatabase.getInstance(application);

        artDao = database.artDao();

        art = artDao.getArtPiece();
        images = artDao.getImages();

        nItems = artDao.moreArtNeeded();

    }

    public void insert(Art art) {
        new InsertArtAsyncTask(artDao).execute(art);
    }

    public void delete(Art art) {
        new DeleteArtAsyncTask(artDao).execute(art);
    }

    public boolean moreArtNeeded() {
        Log.d(TAG, "moreArtNeeded: " +nItems);
        return nItems < 100;
    }

    public LiveData<List<Art>> getArt() {
        return art;
    }

    public LiveData<List<Art>> getImages() {
        return images;
    }
}
