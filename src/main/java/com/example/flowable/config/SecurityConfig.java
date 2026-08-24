package com.example.flowable.config;

import com.example.flowable.common.api.ErrorCodes;
import com.example.flowable.common.web.ErrorBodyWriter;
import com.example.flowable.identity.FlowableUserDetailsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            FlowableUserDetailsService userDetailsService,
            ErrorBodyWriter errorBodyWriter)
            throws Exception {
        AuthenticationEntryPoint entryPoint = (request, response, ex) ->
                errorBodyWriter.write(
                        response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCodes.UNAUTHORIZED, "unauthorized");
        AccessDeniedHandler accessDeniedHandler = (request, response, ex) ->
                errorBodyWriter.write(
                        response, HttpServletResponse.SC_FORBIDDEN, ErrorCodes.FORBIDDEN, "forbidden");

        http.csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
                .httpBasic(basic -> basic.authenticationEntryPoint(entryPoint))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .userDetailsService(userDetailsService)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/h2-console/**",
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs",
                                "/v3/api-docs/**")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .addFilterAfter(new FlowableAuthFilter(), BasicAuthenticationFilter.class);
        return http.build();
    }
}
