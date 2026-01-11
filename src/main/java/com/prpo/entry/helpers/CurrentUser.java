package com.prpo.entry.helpers;

public record CurrentUser(String auth0Sub, String email, String displayName) {}
