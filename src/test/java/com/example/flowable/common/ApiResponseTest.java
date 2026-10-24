package com.example.flowable.common;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.flowable.common.api.ApiResponse;
import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.common.pagination.PaginationHelper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    void okWrapsDataWithZeroCode() {
        ApiResponse<String> body = ApiResponse.ok("pong");
        assertThat(body.code()).isZero();
        assertThat(body.message()).isEqualTo("ok");
        assertThat(body.data()).isEqualTo("pong");
    }

    @Test
    void failUsesErrorCode() {
        ApiResponse<Void> body = ApiResponse.fail(ErrorCodes.NOT_FOUND, "missing");
        assertThat(body.code()).isEqualTo(40400);
        assertThat(body.data()).isNull();
    }

    @Test
    void pageHoldsRecords() {
        Page<String> page = PaginationHelper.buildPage(1, 20, 1, List.of("a"));
        assertThat(page.getCurrent()).isEqualTo(1);
        assertThat(page.getTotal()).isEqualTo(1);
        assertThat(page.getRecords()).containsExactly("a");
    }

    @Test
    void notFoundExceptionCarriesHttp404() {
        BusinessException exception = BusinessException.notFound("task");
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(exception.getCode()).isEqualTo(ErrorCodes.NOT_FOUND);
    }
}
