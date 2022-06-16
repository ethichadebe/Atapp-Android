package com.ethichadebe.atapp.Fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentPagerAdapter;
import androidx.viewpager.widget.ViewPager;

import com.ethichadebe.atapp.R;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.tabs.TabLayout;

import java.util.Objects;

public class ArtItemFragment extends Fragment {
    private static final String TAG = "ArtItemFragment";
    private ViewPager viewPager;
    private TextView tvTitle, tvDescription, tvSmartifyLink, tvArtist;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {

        View v = inflater.inflate(R.layout.frame_art_item, container, false);

        tvArtist = v.findViewById(R.id.tvArtist);
        tvTitle = v.findViewById(R.id.tvTitle);
        tvDescription = v.findViewById(R.id.tvDescription);
        tvSmartifyLink = v. findViewById(R.id.tvSmartifyLink);

        viewPager = v.findViewById(R.id.container);
        setupViewPager(viewPager);

        tabLayout.setupWithViewPager(viewPager);

        return v;
    }

    private void setupViewPager(ViewPager pager) {
        SectionsPageAdapter pageAdapter = new SectionsPageAdapter(Objects.requireNonNull(getActivity()).getSupportFragmentManager(),
                FragmentPagerAdapter.BEHAVIOR_RESUME_ONLY_CURRENT_FRAGMENT);
        //pageAdapter.addFragment(new UpcomingOrderFragmentCustomer(), "Upcoming orders");
       // pageAdapter.addFragment(new PastOrderFragmentCustomer(), "Past orders");
        pager.setAdapter(pageAdapter);
    }

            fragments.add(fragment);

}