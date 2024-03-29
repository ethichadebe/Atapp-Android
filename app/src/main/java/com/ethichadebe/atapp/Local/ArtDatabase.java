package com.ethichadebe.atapp.Local;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.sqlite.db.SupportSQLiteDatabase;

import com.ethichadebe.atapp.Art;

@Database(entities = Art.class, version = 15)
public abstract class ArtDatabase extends RoomDatabase {

    private static ArtDatabase instance;

    public abstract ArtDao artDao();

    public static synchronized ArtDatabase getInstance(Context context) {
        if (instance == null) {
            instance = Room.databaseBuilder(context.getApplicationContext(), ArtDatabase.class, "art_gallery")
                    .allowMainThreadQueries()
                    .fallbackToDestructiveMigration()
                    .addCallback(roomCallback).build();
        }
        return instance;
    }

    private static Callback roomCallback = new Callback() {
        @Override
        public void onCreate(@NonNull SupportSQLiteDatabase db) {
            super.onCreate(db);
        }
    };
}
