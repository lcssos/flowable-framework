package com.example.flowable.identity.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.flowable.identity.entity.SystemUserEntity;
import org.apache.ibatis.annotations.Select;

public interface SystemUserMapper extends BaseMapper<SystemUserEntity> {

    @Select("SELECT * FROM sys_user WHERE username = #{username}")
    SystemUserEntity selectByUsername(String username);
}
