package com.ethichadebe.atapp.Network;

import com.ethichadebe.atapp.Art;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.GET;

public interface ApiEndpoints {

    @GET("getArts100")
    Call<List<Art>> getArt();
}
