package com.example.flowable.common.exception;

import com.example.flowable.common.api.ErrorCodes;
import org.springframework.http.HttpStatus;

public final class BusinessException extends RuntimeException {
    private final int code;
    private final HttpStatus status;

    public BusinessException(int code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(ErrorCodes.BAD_REQUEST, HttpStatus.BAD_REQUEST, message);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN, message);
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND, message);
    }

    public static BusinessException unauthorized(String message) {
        return new BusinessException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, message);
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
