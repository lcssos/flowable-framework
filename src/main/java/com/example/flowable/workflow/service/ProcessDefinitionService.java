package com.example.flowable.workflow.service;

import com.example.flowable.common.exception.BusinessException;
import com.example.flowable.workflow.dto.ProcessDefinitionSummary;
import com.example.flowable.workflow.dto.ProcessModelView;
import org.flowable.bpmn.converter.BpmnXMLConverter;
import org.flowable.bpmn.model.BpmnModel;
import org.flowable.bpmn.model.Process;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.repository.ProcessDefinition;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class ProcessDefinitionService {

    private static final Pattern PROCESS_KEY = Pattern.compile("[A-Za-z_][A-Za-z0-9_\\-.]*");

    private final RepositoryService repositoryService;

    public ProcessDefinitionService(RepositoryService repositoryService) {
        this.repositoryService = repositoryService;
    }

    public List<ProcessDefinitionSummary> listLatest() {
        return repositoryService.createProcessDefinitionQuery()
                .latestVersion()
                .orderByProcessDefinitionKey()
                .asc()
                .list()
                .stream()
                .map(ProcessDefinitionService::toSummary)
                .toList();
    }

    public ProcessModelView getModel(String key) {
        ProcessDefinition definition = requireLatest(key);
        try (InputStream model = repositoryService.getProcessModel(definition.getId())) {
            String xml = new String(model.readAllBytes(), StandardCharsets.UTF_8);
            return new ProcessModelView(definition.getKey(), definition.getName(), definition.getVersion(), xml);
        } catch (IOException exception) {
            throw BusinessException.notFound("process definition");
        }
    }

    public ProcessDefinitionSummary deploy(String xml) {
        byte[] bytes = xml.getBytes(StandardCharsets.UTF_8);
        String key = processKey(bytes);
        repositoryService.createDeployment()
                .name("designer-" + key)
                .enableDuplicateFiltering()
                .addBytes(key + ".bpmn20.xml", bytes)
                .deploy();
        return toSummary(requireLatest(key));
    }

    private ProcessDefinition requireLatest(String key) {
        ProcessDefinition definition = repositoryService.createProcessDefinitionQuery()
                .processDefinitionKey(key)
                .latestVersion()
                .singleResult();
        if (definition == null) {
            throw BusinessException.notFound("process definition");
        }
        return definition;
    }

    private static String processKey(byte[] xml) {
        BpmnModel model;
        try {
            model = new BpmnXMLConverter().convertToBpmnModel(
                    () -> new ByteArrayInputStream(xml), false, false);
        } catch (RuntimeException exception) {
            throw BusinessException.badRequest("invalid bpmn xml");
        }
        List<Process> processes = model.getProcesses();
        if (processes == null || processes.isEmpty() || model.getMainProcess() == null) {
            throw BusinessException.badRequest("invalid bpmn xml");
        }
        String key = model.getMainProcess().getId();
        if (key == null || !PROCESS_KEY.matcher(key).matches()) {
            throw BusinessException.badRequest("process id is required");
        }
        if (!model.getMainProcess().isExecutable()) {
            throw BusinessException.badRequest("process must be executable");
        }
        return key;
    }

    private static ProcessDefinitionSummary toSummary(ProcessDefinition definition) {
        return new ProcessDefinitionSummary(definition.getKey(), definition.getName(), definition.getVersion());
    }
}
