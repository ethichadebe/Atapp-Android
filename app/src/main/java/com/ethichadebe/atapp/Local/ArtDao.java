package com.ethichadebe.atapp.Local;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;

import com.ethichadebe.atapp.Art;

import java.util.List;

@Dao
public interface ArtDao {

    @Insert
    void insert(Art art);

    @Update
    void update(Art art);

    @Query("DELETE FROM art_gallery")
    void delete();

    @Query("SELECT count(*) FROM (select 0 from art_gallery limit 1)")
    int isTableEmpty();

    @Query("SELECT * FROM art_gallery")
    LiveData<List<Art>> getArtPiece();
}
