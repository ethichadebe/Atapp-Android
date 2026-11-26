package com.ethichadebe.atapp;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.util.Calendar;
import java.util.TimeZone;
import org.junit.Test;

public class NativeLogicTest {

    private static Calendar at(int hour, int minute) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("Africa/Johannesburg"));
        c.set(2026, Calendar.NOVEMBER, 26, hour, minute, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    @Test
    public void theMorningRunIsAtEightToday() {
        assertEquals((60 + 30) * 60 * 1000L, Daily.millisUntil(8, at(6, 30)));
    }

    @Test
    public void theMorningRunIsTomorrowOncePastEight() {
        assertEquals(23 * 60 * 60 * 1000L, Daily.millisUntil(8, at(9, 0)));
        assertEquals(24 * 60 * 60 * 1000L, Daily.millisUntil(8, at(8, 0)));
    }

    private static final String TODAY = "{\"date\":\"2026-11-26\",\"artwork\":{\"objectId\":1,\"title\":\"Antony Thouret\","
        + "\"artist\":\"Honoré Daumier\",\"image\":{\"sizes\":[{\"width\":480,\"url\":\"https://img/480\"},"
        + "{\"width\":800,\"url\":\"https://img/800\"}]}}}";

    @Test
    public void readsTheArtOfTheDay() throws Exception {
        Today t = Today.parse(TODAY, new File("x"));
        assertEquals("2026-11-26", t.date);
        assertEquals("Antony Thouret", t.title);
        assertEquals("Honoré Daumier", t.artist);
        assertEquals("https://img/480", Today.imageUrl(TODAY));
    }

    @Test
    public void anUnknownArtistIsBlank() throws Exception {
        String json = "{\"date\":\"2026-11-26\",\"artwork\":{\"title\":\"Untitled\",\"artist\":null,\"image\":{\"sizes\":[]}}}";
        assertEquals("", Today.parse(json, null).artist);
        assertNull(Today.imageUrl(json));
    }

    @Test
    public void beforeTheFirstImportThereIsNoArt() throws Exception {
        assertNull(Today.parse("{\"date\":\"2026-11-26\",\"artwork\":null}", null));
    }

    @Test
    public void savedImagesAreNamedByTheirAddress() {
        String a = ImageCache.fileName("https://img/1");
        assertEquals(a, ImageCache.fileName("https://img/1"));
        assertTrue(a.matches("[0-9a-f]{40}\\.jpg"));
        assertTrue(!a.equals(ImageCache.fileName("https://img/2")));
    }

    @Test
    public void everyDancerHasALauncherEntry() {
        assertEquals(10, IconSwitcher.DANCERS.size());
        assertTrue(IconSwitcher.DANCERS.contains(IconSwitcher.DEFAULT));
        assertEquals("com.ethichadebe.atapp.Icon_cargo", IconSwitcher.alias("cargo"));
    }
}
