package com.ethichadebe.atapp.ViewModel;

import android.app.Application;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.lifecycle.Observer;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Network.ApiResponse;
import com.ethichadebe.atapp.Repository.ArtRepo;

import java.util.List;

public class ArtViewModel extends AndroidViewModel {
    private static final String TAG = "ArtViewModel";

    private ArtRepo repo;
    private MediatorLiveData<ApiResponse> mApiResponse;

    public ArtViewModel(@NonNull Application application) {
        super(application);
        mApiResponse = new MediatorLiveData<>();
        repo = new ArtRepo(application);
    }

    public LiveData<ApiResponse> getRemoteData() {
        mApiResponse.addSource(repo.makeAPICall(), new Observer<ApiResponse>() {
            @Override
            public void onChanged(ApiResponse apiResponse) {
                mApiResponse.setValue(apiResponse);
            }
        });
        return mApiResponse;
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

    public boolean moreArtNeeded() {
        return repo.moreArtNeeded();
    }
}