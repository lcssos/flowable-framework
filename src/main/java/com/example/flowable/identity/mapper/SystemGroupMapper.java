package com.example.flowable.identity.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.flowable.identity.entity.SystemGroupEntity;
import org.apache.ibatis.annotations.Select;

public interface SystemGroupMapper extends BaseMapper<SystemGroupEntity> {

    @Select("SELECT * FROM sys_group WHERE group_code = #{groupCode}")
    SystemGroupEntity selectByGroupCode(String groupCode);
}
