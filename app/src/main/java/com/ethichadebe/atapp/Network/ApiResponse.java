package com.ethichadebe.atapp.Network;

import com.ethichadebe.atapp.Art;

import java.util.List;

public class ApiResponse {

    public List<Art> posts;
    private Throwable error;

    public ApiResponse(List<Art> posts) {
        this.posts = posts;
        this.error = null;
    }

    public ApiResponse(Throwable error) {
        this.error = error;
        this.posts = null;
    }

    public List<Art> getPosts() {
        return posts;
    }

    public void setPosts(List<Art> posts) {
        this.posts = posts;
    }

    public Throwable getError() {
        return error;
    }

    public void setError(Throwable error) {
        this.error = error;
    }
}