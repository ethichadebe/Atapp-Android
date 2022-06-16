package com.ethichadebe.atapp.AsyncTasks;

import android.os.AsyncTask;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Local.ArtDao;

public class DeleteArtAsyncTask extends AsyncTask<Art, Void, Void> {
    private ArtDao artDao;

    public DeleteArtAsyncTask(ArtDao artDao) {
        this.artDao = artDao;
    }

    @Override
    protected Void doInBackground(Art... arts) {
        artDao.delete();

        return null;
    }
}
