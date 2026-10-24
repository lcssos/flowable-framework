package com.example.flowable.common.pagination;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import java.util.List;

public final class PaginationHelper {

    private PaginationHelper() {}

    public static <Record> Page<Record> buildPage(long page, long size, long total, List<Record> records) {
        Page<Record> result = new Page<>(page, size, total);
        result.setRecords(records);
        return result;
    }
}
