package com.example.flowable.workflow.service;

import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.identity.dto.CurrentUser;
import com.example.flowable.workflow.dto.ProcessInstanceView;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.repository.ProcessDefinition;
import org.flowable.engine.runtime.ProcessInstance;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class ProcessCommandService {

    private final RepositoryService repositoryService;
    private final RuntimeService runtimeService;

    public ProcessCommandService(RepositoryService repositoryService, RuntimeService runtimeService) {
        this.repositoryService = repositoryService;
        this.runtimeService = runtimeService;
    }

    public ProcessInstanceView start(String processDefinitionKey, Map<String, Object> variables, CurrentUser user) {
        ProcessDefinition definition = repositoryService.createProcessDefinitionQuery()
                .processDefinitionKey(processDefinitionKey)
                .latestVersion()
                .singleResult();
        if (definition == null) {
            throw BusinessException.notFound("process definition");
        }
        if ("leave".equals(processDefinitionKey)) {
            Object days = variables != null ? variables.get("days") : null;
            if (!(days instanceof Number number) || number.intValue() <= 0) {
                throw BusinessException.badRequest("days must be a positive number");
            }
        }
        Map<String, Object> startVariables = new HashMap<>();
        if (variables != null) {
            startVariables.putAll(variables);
        }
        startVariables.put("initiator", user.userId());
        ProcessInstance instance = runtimeService.startProcessInstanceByKey(processDefinitionKey, startVariables);
        return toView(instance, definition);
    }

    private static ProcessInstanceView toView(ProcessInstance instance, ProcessDefinition definition) {
        String name = instance.getProcessDefinitionName() != null
                ? instance.getProcessDefinitionName()
                : definition.getName();
        return new ProcessInstanceView(
                instance.getId(),
                instance.getProcessDefinitionKey(),
                name,
                instance.getStartUserId(),
                toInstant(instance.getStartTime()));
    }

    private static Instant toInstant(Date date) {
        return date == null ? null : date.toInstant();
    }
}
