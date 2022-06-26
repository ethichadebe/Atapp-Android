package com.ethichadebe.atapp.AsyncTasks;

import android.os.AsyncTask;
import android.util.Log;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Local.ArtDao;

public class DeleteArtAsyncTask extends AsyncTask<Art, Void, Void> {
    private static final String TAG = "DeleteArtAsyncTask";
    private ArtDao artDao;

    public DeleteArtAsyncTask(ArtDao artDao) {
        this.artDao = artDao;
    }

    @Override
    protected Void doInBackground(Art... arts) {
        artDao.delete(arts[0]);
        Log.d(TAG, "doInBackground: Deleted item " + arts[0].getTitle());

        return null;
    }
}
