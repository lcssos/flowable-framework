package com.example.flowable.common.web;

import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.api.R;
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
    public ResponseEntity<R<Void>> handleBusiness(BusinessException ex) {
        return ResponseEntity.status(ex.getStatus()).body(R.fail(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(FlowableObjectNotFoundException.class)
    public ResponseEntity<R<Void>> handleFlowableNotFound(FlowableObjectNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(R.fail(ErrorCodes.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(FlowableException.class)
    public ResponseEntity<R<Void>> handleFlowable(FlowableException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(R.fail(ErrorCodes.INTERNAL, "internal error"));
    }

    @ExceptionHandler({
            MethodArgumentNotValidException.class,
            HandlerMethodValidationException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<R<Void>> handleBadRequest(Exception ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "bad request";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(R.fail(ErrorCodes.BAD_REQUEST, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<R<Void>> handleOther(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(R.fail(ErrorCodes.INTERNAL, "internal error"));
    }
}
