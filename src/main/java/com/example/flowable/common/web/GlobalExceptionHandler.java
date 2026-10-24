package com.example.flowable.common.web;

import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.exception.NotPermissionException;
import cn.dev33.satoken.exception.NotRoleException;
import com.example.flowable.common.api.ApiResponse;
import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.exception.BusinessException;
import org.flowable.common.engine.api.FlowableException;
import org.flowable.common.engine.api.FlowableObjectNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(ApiResponse.fail(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(NotLoginException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotLogin(NotLoginException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.fail(ErrorCodes.UNAUTHORIZED, "unauthorized"));
    }

    @ExceptionHandler({NotPermissionException.class, NotRoleException.class})
    public ResponseEntity<ApiResponse<Void>> handleNotPermission(RuntimeException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.fail(ErrorCodes.FORBIDDEN, "forbidden"));
    }

    @ExceptionHandler(FlowableObjectNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleFlowableNotFound(FlowableObjectNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.fail(ErrorCodes.NOT_FOUND, exception.getMessage()));
    }

    @ExceptionHandler(FlowableException.class)
    public ResponseEntity<ApiResponse<Void>> handleFlowable(FlowableException exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(ErrorCodes.INTERNAL, "internal error"));
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            HandlerMethodValidationException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception exception) {
        String message = exception.getMessage() != null ? exception.getMessage() : "bad request";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.fail(ErrorCodes.BAD_REQUEST, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(ErrorCodes.INTERNAL, "internal error"));
    }
}
