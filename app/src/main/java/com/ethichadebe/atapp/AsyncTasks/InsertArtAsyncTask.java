package com.ethichadebe.atapp.AsyncTasks;

import android.os.AsyncTask;
import android.util.Log;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Local.ArtDao;

public class InsertArtAsyncTask extends AsyncTask<Art, Void, Void> {
    private static final String TAG = "InsertArtAsyncTask";
    private ArtDao artDao;

    public InsertArtAsyncTask(ArtDao artDao) {
        this.artDao = artDao;
    }

    @Override
    protected Void doInBackground(Art... arts) {
        artDao.insert(arts[0]);
        Log.d(TAG, "doInBackground: Inserted item " + arts[0].getTitle());
        return null;
    }
}
