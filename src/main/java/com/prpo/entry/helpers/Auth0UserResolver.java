package com.prpo.entry.helpers;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class Auth0UserResolver {

  public String currentUserId() {
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (!(principal instanceof Jwt jwt)) {
      throw new IllegalStateException("Expected JWT principal");
    }
    return jwt.getSubject();
  }

  public String currentEmail() {
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (!(principal instanceof Jwt jwt)) {
      return null;
    }
    return jwt.getClaimAsString("email");
  }

  public String currentDisplayName() {
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (!(principal instanceof Jwt jwt)) {
      return null;
    }
    String name = jwt.getClaimAsString("name");
    if (name != null) return name;
    return jwt.getClaimAsString("nickname");
  }
}
