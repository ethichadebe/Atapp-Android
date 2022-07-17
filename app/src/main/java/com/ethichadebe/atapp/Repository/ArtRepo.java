package com.ethichadebe.atapp.Repository;

import android.app.Application;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.AsyncTasks.DeleteArtAsyncTask;
import com.ethichadebe.atapp.AsyncTasks.InsertArtAsyncTask;
import com.ethichadebe.atapp.Local.ArtDao;
import com.ethichadebe.atapp.Local.ArtDatabase;
import com.ethichadebe.atapp.Network.ApiEndpoints;
import com.ethichadebe.atapp.Network.ApiResponse;
import com.ethichadebe.atapp.Network.ApiService;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ArtRepo {
    private static final String TAG = "ArtRepo";

    public ApiEndpoints endpoints;
    private final ArtDao artDao;
    private final int nItems;

    private final LiveData<List<Art>> art;
    private final List<Art> artToDelete;
    private final LiveData<List<Art>> preloadImages;

    public ArtRepo(Application application) {
        ArtDatabase database = ArtDatabase.getInstance(application);

        endpoints = ApiService.getService();

        artDao = database.artDao();
        art = artDao.getArtPiece();
        artToDelete = artDao.artToDelete();
        preloadImages = artDao.getPreloadImages();

        nItems = artDao.moreArtNeeded();
    }

    public void insert(Art art) {
        new InsertArtAsyncTask(artDao).execute(art);
    }

    public void delete(Art art) {
        new DeleteArtAsyncTask(artDao).execute(art);
    }

    public boolean moreArtNeeded() {
        Log.d(TAG, "moreArtNeeded: " + nItems);
        return nItems < 100;
    }

    public LiveData<ApiResponse> makeAPICall() {
        final MutableLiveData<ApiResponse> apiResponse = new MutableLiveData<>();
        Call<List<Art>> call = endpoints.getArt();
        call.enqueue(new Callback<List<Art>>() {
            @Override
            public void onResponse(@NonNull Call<List<Art>> call, @NonNull Response<List<Art>> response) {
                if (response.isSuccessful()) {
                    //Log.d(TAG, "onResponse: " + response.body());
                    List<Art> arts = response.body();

                    //Populate database
                    assert arts != null;
                    for (Art art : arts) {
                        insert(art);
                    }

                    Log.d("APICall: Random Word", arts.get(0).getRandom_word());
                    Log.d("APICall: Title", arts.get(0).getTitle());
                    Log.d("APICall: Artist", arts.get(0).getArtist());
                    Log.d("APICall: Description", arts.get(0).getDescription());
                    Log.d("APICall: Image", arts.get(0).getImage());
                    Log.d("APICall: Vibrant colour", arts.get(0).getVibrant());
                    Log.d("APICall: Muted colours", arts.get(0).getMuted());

                    apiResponse.postValue(new ApiResponse(response.body()));
                } else {
                    Log.d("APICall: response error", String.valueOf(response.code()));
                }
            }

            @Override
            public void onFailure(@NonNull Call<List<Art>> call, @NonNull Throwable t) {
                apiResponse.postValue(new ApiResponse(t));
            }
        });

        return apiResponse;
    }

    public LiveData<List<Art>> getArt() {
        return art;
    }

    public List<Art> getArtToDelete() {
        return artToDelete;
    }

    public LiveData<List<Art>> preloadImages() {
        return preloadImages;
    }
}
