package com.ethichadebe.atapp.AsyncTasks;

import android.os.AsyncTask;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Local.ArtDao;

public class isEmptyArtAsyncTask extends AsyncTask<Art, Void, Void> {
    private ArtDao artDao;

    private isEmptyArtAsyncTask(ArtDao artDao) {
        this.artDao = artDao;
    }

    @Override
    protected Void doInBackground(Art... arts) {
        artDao.isTableEmpty();

        return null;
    }
}
