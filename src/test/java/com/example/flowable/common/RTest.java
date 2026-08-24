package com.example.flowable.common;

import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.api.PageData;
import com.example.flowable.common.api.R;
import com.example.flowable.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RTest {

    @Test
    void okWrapsDataWithZeroCode() {
        R<String> body = R.ok("pong");
        assertThat(body.code()).isZero();
        assertThat(body.message()).isEqualTo("ok");
        assertThat(body.data()).isEqualTo("pong");
    }

    @Test
    void failUsesErrorCode() {
        R<Void> body = R.fail(ErrorCodes.NOT_FOUND, "missing");
        assertThat(body.code()).isEqualTo(40400);
        assertThat(body.data()).isNull();
    }

    @Test
    void pageDataHoldsItems() {
        PageData<String> page = new PageData<>(1, 20, 1, List.of("a"));
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.total()).isEqualTo(1);
    }

    @Test
    void notFoundExceptionCarriesHttp404() {
        BusinessException ex = BusinessException.notFound("task");
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ex.getCode()).isEqualTo(ErrorCodes.NOT_FOUND);
    }
}
