package com.ethichadebe.atapp.Network;

import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public final class ApiService {

    public static String BASE_URL = "https://obscure-retreat-81520.herokuapp.com/smartify/";
    private static ApiEndpoints endpoints;

    public static ApiEndpoints getService() {
        if (endpoints == null) {
            Retrofit retrofit = new Retrofit.Builder()
                    .addConverterFactory(GsonConverterFactory.create())
                    .baseUrl(BASE_URL)
                    .build();

            endpoints = retrofit.create(ApiEndpoints.class);
        }

        return endpoints;

    }

}