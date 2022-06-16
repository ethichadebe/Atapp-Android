package com.ethichadebe.atapp.Adapter;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;

import com.ethichadebe.atapp.Art;
import com.ethichadebe.atapp.Fragments.ArtItemFragment;

import java.util.ArrayList;
import java.util.List;

public class ArtSliderAdapter extends FragmentPagerAdapter {

    private final List<Fragment> fragments = new ArrayList<>();

    public void addFragment(List<Art> arts) {
        for (Art art : arts) {
            fragments.add(new ArtItemFragment());
        }
    }

    public ArtSliderAdapter(@NonNull FragmentManager fm) {
        super(fm);
    }

    @NonNull
    @Override
    public Fragment getItem(int position) {
        return fragments.get(position);
    }

    @Override
    public int getCount() {
        return fragments.size();
    }
}