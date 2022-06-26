package com.ethichadebe.atapp.Local;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;

import com.ethichadebe.atapp.Art;

import java.util.List;

@Dao
public interface ArtDao {

    /**
     * Insert Art item to local database
     * @param art art item to be inserted
     */
    @Insert
    void insert(Art art);

    /**
     * Delete Art item to local database
     * @param art art item to be deleted
     */
    @Delete
    void delete(Art art);

    /**
     * count items in local database
     * @return number of items in the art_gallery table
     */
    @Query("SELECT count(*) FROM art_gallery")
    int moreArtNeeded();

    /**
     *
     * @return 10 art items
     */
    @Query("SELECT * FROM art_gallery LIMIT 10")
    LiveData<List<Art>> getArtPiece();

    @Query("SELECT * FROM art_gallery")
    LiveData<List<Art>> getImages();
}
