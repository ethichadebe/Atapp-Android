package com.ethichadebe.atapp.ViewModel;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.lifecycle.Observer;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Repository.ArtRepo;

import java.util.List;

public class ArtViewModel extends AndroidViewModel {
    private static final String TAG = "ArtViewModel";

    private ArtRepo repo;

    public ArtViewModel(@NonNull Application application) {
        super(application);
        repo = new ArtRepo(application);
    }

    public LiveData<List<Art>> getLocalData() {
        return repo.getArt();
    }

    public List<Art> getArtToDelete() {
        return repo.getArtToDelete();
    }

    public LiveData<List<Art>> getPreloadImages() {
        return repo.preloadImages();
    }

    /**
     * remove art piece from local room database
     */
    public void delete(Art art) {
        repo.delete(art);
    }

    /**
     * remove art piece from local room database
     */
    public void insert(Art art) {
        repo.insert(art);
    }

    public boolean moreArtNeeded() {
        return repo.moreArtNeeded();
    }
}