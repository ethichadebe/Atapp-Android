package com.ethichadebe.atapp.Repository;

import android.app.Application;

import androidx.lifecycle.LiveData;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.AsyncTasks.DeleteArtAsyncTask;
import com.ethichadebe.atapp.AsyncTasks.InsertArtAsyncTask;
import com.ethichadebe.atapp.Local.ArtDao;
import com.ethichadebe.atapp.Local.ArtDatabase;

import java.util.List;

public class ArtRepo {

    public static final String TAG = "ArtRepo";
    private ArtDao artDao;
    private LiveData<List<Art>> art;

    public ArtRepo(Application application) {
        ArtDatabase database = ArtDatabase.getInstance(application);

        artDao = database.artDao();

        art = artDao.getArtPiece();

    }

    public void insert(Art art) {
        new InsertArtAsyncTask(artDao).execute(art);
    }

    public void delete() {
        new DeleteArtAsyncTask(artDao).execute();
    }

    public LiveData<List<Art>> getArt() {
        return art;
    }
}
