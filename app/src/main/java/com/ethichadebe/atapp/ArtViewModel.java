package com.ethichadebe.atapp;

import android.app.Application;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.ethichadebe.atapp.Network.APIService;
import com.ethichadebe.atapp.Network.RetrofitInstance;
import com.ethichadebe.atapp.Repository.ArtRepo;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ArtViewModel extends AndroidViewModel {
    private static final String TAG = "ArtViewModel";
    private ArtRepo repo;
    private LiveData<List<Art>> artLiveData;
    private MediatorLiveData<List<Art>> art;

    private final APIService apiService = RetrofitInstance.getRetrofitClient().create(APIService.class);
    private final Call<List<Art>> call = apiService.getArt();


    public ArtViewModel(@NonNull Application application) {
        super(application);

        repo = new ArtRepo(application);
        artLiveData = repo.getArt();
        art = new MediatorLiveData<>();
    }

    public MediatorLiveData<List<Art>> getArtObserver() {
        return art;
    }

    /**
     * Insert art piece to local room database
     *
     * @param art retried from the remote database
     */
    public void insert(Art art) {
        repo.insert(art);
    }

    /**
     * remove art piece from local room database
     */
    public void delete() {
        repo.delete();
    }

    /**
     * get art piece from the remote database
     */
    public void makeAPICall() {
        call.enqueue(new Callback<List<Art>>() {
            @Override
            public void onResponse(Call<List<Art>> call, Response<List<Art>> response) {
                if (!response.isSuccessful()) {
                    Log.d("APICall: response error", String.valueOf(response.code()));

                }
                Log.d(TAG, "onResponse: " + response.body());
                List<Art> arts = response.body();
                delete();

                //Populate database
                assert arts != null;
                for (Art art: arts){
                    insert(art);
                }

                Log.d("APICall: Random Word", arts.get(0).getRandom_word());
                Log.d("APICall: Title", arts.get(0).getTitle());
                Log.d("APICall: Artist", arts.get(0).getArtist());
                Log.d("APICall: Description", arts.get(0).getDescription());
                Log.d("APICall: Image", arts.get(0).getImage());
                Log.d("APICall: Vibrant colour", arts.get(0).getVibrant());
                Log.d("APICall: Muted colours", arts.get(0).getMuted());

            }

            @Override
            public void onFailure(Call<List<Art>> call, Throwable t) {
                Log.d("APICall: error", t.getMessage());
                art.postValue(null);
                makeAPICall();

            }
        });
    }

    public void cancelCall() {
        call.cancel();
    }

    public LiveData<List<Art>> getArt() {
        return artLiveData;
    }
}



