package com.example.flowable.common.api;

public record ApiResponse<T>(int code, String message, T data) {
    public static <Data> ApiResponse<Data> ok(Data data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(0, "ok", null);
    }

    public static <Data> ApiResponse<Data> fail(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
