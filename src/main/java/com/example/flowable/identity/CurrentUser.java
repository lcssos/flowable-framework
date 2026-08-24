package com.example.flowable.identity;

import java.util.Set;

public record CurrentUser(String userId, Set<String> groupIds, boolean admin) {}
