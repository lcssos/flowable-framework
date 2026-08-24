package com.example.flowable.common.api;

import java.util.List;

public record PageData<T>(int page, int size, long total, List<T> items) {}
