(function () {
    const DATA_PATH = window.DISRUPTION_WORKSPACE_DATA || 'data/disruption-mitigation-workspace.json';
    const STORAGE_KEY = 'lxnDisruptionGuideSession.v2';
    const LEGACY_STATUS_KEY = 'lxnDisruptionGuideStatuses.v1';
    const SESSION_VERSION = 2;
    const UNCERTAINTY_STATUS_IDS = ['assumed', 'missing', 'conflicting'];
    const WORKSPACE_HELP_AUTO_CLOSE_SELECTOR = [
        '[data-disruption-id]',
        '[data-mode]',
        '[data-stage]',
        '[data-status]',
        '[data-summary-toggle]',
        '[data-copy-summary]',
        '[data-decision-field]',
        '#dmgResetStates',
        '#dmgSearchInput'
    ].join(',');
    const DOMAIN_CHECK_KEYWORDS = {
        'Materials and products': ['material', 'product', 'goods', 'batch', 'batches', 'lot', 'component', 'components', 'handling unit', 'finished product', 'source origin', 'origin', 'constrained material'],
        'Transformations': ['transformation', 'transformations', 'processing', 'assembly', 'aggregation', 'disaggregation', 'blending', 'inspection', 'inspected', 'produced', 'manufacturing', 'processor'],
        'Movement and location': ['route', 'shipment', 'shipments', 'consignment', 'consignments', 'carrier', 'transport', 'movement', 'location', 'locations', 'port', 'border', 'vessel', 'leg', 'destination', 'origin', 'warehouse', 'warehouses', 'in-transit', 'received', 'reroute', 'rerouting', 'network', 'air corridor', 'jurisdiction', 'customs'],
        'Custody and responsibility': ['custody', 'responsibility', 'possession', 'control', 'controlled', 'handoff', 'handoffs', 'held', 'carrier', 'logistics-party'],
        'Condition and evidence': ['condition', 'evidence', 'certificate', 'certificates', 'declaration', 'declarations', 'sensor', 'quality', 'release', 'inspection', 'inspected', 'provenance', 'qualification', 'valid', 'validated', 'verified', 'trust', 'trusted', 'record', 'records', 'forensic', 'monitoring', 'siem', 'endpoint', 'credential', 'cyber'],
        'Organisations and roles': ['supplier', 'suppliers', 'processor', 'processors', 'carrier', 'carriers', 'logistics', 'customer', 'customers', 'regulator', 'regulators', 'internal', 'owner', 'owners', 'party', 'parties', 'issuer', 'authority', 'authorities', 'legal', 'compliance', 'procurement'],
        'Production and inventory': ['production', 'inventory', 'supply', 'quantity', 'quantities', 'capacity', 'available', 'allocated', 'consumed', 'produced', 'mes', 'erp', 'wms', 'planning', 'schedule', 'schedules', 'line', 'lead time', 'inventory cover'],
        'Obligations and commitments': ['obligation', 'obligations', 'commitment', 'commitments', 'customer', 'customers', 'order', 'orders', 'regulatory', 'contract', 'contractual', 'deadline', 'deadlines', 'penalty', 'penalties', 'service', 'promise', 'promises', 'approval', 'approvals', 'sanctions', 'tariff', 'compliance']
    };
    const app = document.querySelector('[data-workspace-app]');
    const loadingState = document.getElementById('dmgLoadingState');
    const listEl = document.getElementById('dmgDisruptionList');
    const searchEl = document.getElementById('dmgSearchInput');
    const resetEl = document.getElementById('dmgResetStates');
    const methodOverviewEl = document.getElementById('dmgMethodOverview');
    const useModesEl = document.getElementById('dmgUseModes');
    const workspaceHelpButton = document.getElementById('dmgWorkspaceHelpButton');
    const workspaceHelpPanel = document.getElementById('dmgWorkspaceHelp');
    const workspaceHelpBackdrop = document.getElementById('dmgWorkspaceHelpBackdrop');
    const workspaceHelpClose = document.getElementById('dmgWorkspaceHelpClose');

    let workspaceData = null;
    let selectedId = null;
    let activeMode = 'navigate';
    let activeStage = 0;
    let session = loadSession();
    let statuses = session.statuses;
    let decisions = session.decisions;
    let summaryVisible = false;
    let workspaceHelpReturnFocus = null;

    function track(eventName, label) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, {
                event_category: 'Disruption Mitigation Workspace',
                event_label: label,
                value: 1
            });
        }
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    function loadSession() {
        try {
            const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
            if (stored && stored.version === SESSION_VERSION) {
                return {
                    version: SESSION_VERSION,
                    statuses: stored.statuses || {},
                    decisions: stored.decisions || {}
                };
            }

            const legacyStatuses = JSON.parse(window.localStorage.getItem(LEGACY_STATUS_KEY) || '{}');
            return {
                version: SESSION_VERSION,
                statuses: legacyStatuses || {},
                decisions: {}
            };
        } catch (error) {
            return {
                version: SESSION_VERSION,
                statuses: {},
                decisions: {}
            };
        }
    }

    function saveSession() {
        try {
            session.statuses = statuses;
            session.decisions = decisions;
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            // Local storage may be unavailable in private browsing contexts.
        }
    }

    function workspaceHelpIsOpen() {
        return Boolean(workspaceHelpPanel && workspaceHelpPanel.classList.contains('open'));
    }

    function openWorkspaceHelp() {
        if (!workspaceHelpButton || !workspaceHelpPanel || !workspaceHelpBackdrop) return;

        workspaceHelpReturnFocus = document.activeElement;
        workspaceHelpButton.setAttribute('aria-expanded', 'true');
        workspaceHelpPanel.setAttribute('aria-hidden', 'false');
        workspaceHelpPanel.removeAttribute('inert');
        workspaceHelpBackdrop.classList.add('open');
        workspaceHelpPanel.classList.add('open');

        if (workspaceHelpClose) {
            workspaceHelpClose.focus({ preventScroll: true });
        } else {
            workspaceHelpPanel.focus({ preventScroll: true });
        }

        track('workspace_instructions_opened', 'How to use this workspace');
    }

    function closeWorkspaceHelp(options) {
        const settings = options || {};
        if (!workspaceHelpButton || !workspaceHelpPanel || !workspaceHelpBackdrop || !workspaceHelpIsOpen()) return;

        workspaceHelpButton.setAttribute('aria-expanded', 'false');
        workspaceHelpPanel.setAttribute('aria-hidden', 'true');
        workspaceHelpPanel.setAttribute('inert', '');
        workspaceHelpBackdrop.classList.remove('open');
        workspaceHelpPanel.classList.remove('open');

        if (settings.returnFocus !== false && workspaceHelpReturnFocus && typeof workspaceHelpReturnFocus.focus === 'function') {
            workspaceHelpReturnFocus.focus({ preventScroll: true });
        }

        track(settings.eventName || 'workspace_instructions_closed', settings.label || 'manual');
    }

    function autoCloseWorkspaceHelp(label) {
        closeWorkspaceHelp({
            returnFocus: false,
            eventName: 'workspace_instructions_auto_closed',
            label: label
        });
    }

    function coveredWorkspaceControl(event) {
        if (!workspaceHelpIsOpen() || !workspaceHelpPanel || !workspaceHelpPanel.contains(event.target)) return null;
        if (event.target.closest('#dmgWorkspaceHelpClose')) return null;

        const panelPointerEvents = workspaceHelpPanel.style.pointerEvents;
        const backdropPointerEvents = workspaceHelpBackdrop ? workspaceHelpBackdrop.style.pointerEvents : '';
        workspaceHelpPanel.style.pointerEvents = 'none';
        if (workspaceHelpBackdrop) {
            workspaceHelpBackdrop.style.pointerEvents = 'none';
        }

        const underlying = document.elementFromPoint(event.clientX, event.clientY);
        workspaceHelpPanel.style.pointerEvents = panelPointerEvents;
        if (workspaceHelpBackdrop) {
            workspaceHelpBackdrop.style.pointerEvents = backdropPointerEvents;
        }

        return underlying ? underlying.closest(WORKSPACE_HELP_AUTO_CLOSE_SELECTOR) : null;
    }

    function getWorkspace() {
        return app ? app.querySelector('.dmg-workspace') : null;
    }

    function selectedDisruption() {
        return workspaceData.disruptions.find(function (item) {
            return item.id === selectedId;
        }) || workspaceData.disruptions[0];
    }

    function statusKey(disruptionId, group, index) {
        return [disruptionId, group, index].join(':');
    }

    function getStatus(disruptionId, group, index) {
        return statuses[statusKey(disruptionId, group, index)] || '';
    }

    function setStatus(disruptionId, group, index, value) {
        const key = statusKey(disruptionId, group, index);
        if (statuses[key] === value) {
            delete statuses[key];
        } else {
            statuses[key] = value;
        }
        saveSession();
    }

    function countStatuses(disruption) {
        const counts = {};
        workspaceData.informationStatuses.forEach(function (status) {
            counts[status.id] = 0;
        });

        ['lifecycleData', 'otherData'].forEach(function (group) {
            (disruption[group] || []).forEach(function (_item, index) {
                const status = getStatus(disruption.id, group, index);
                if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
            });
        });

        return counts;
    }

    function getDecision(disruptionId, field) {
        return ((decisions[disruptionId] || {})[field] || '');
    }

    function setDecision(disruptionId, field, value) {
        if (!decisions[disruptionId]) {
            decisions[disruptionId] = {};
        }

        if (String(value || '').trim()) {
            decisions[disruptionId][field] = value;
        } else {
            delete decisions[disruptionId][field];
        }

        if (!Object.keys(decisions[disruptionId]).length) {
            delete decisions[disruptionId];
        }

        saveSession();
    }

    function getStatusLabel(statusId) {
        const status = workspaceData.informationStatuses.find(function (item) {
            return item.id === statusId;
        });
        return status ? status.label : statusId;
    }

    function getUncertaintyGroups(disruption) {
        const groups = [
            { key: 'lifecycleData', title: 'Lifecycle Continuity data', items: disruption.lifecycleData || [] },
            { key: 'otherData', title: 'Other required data', items: disruption.otherData || [] }
        ];

        return groups.map(function (group) {
            return {
                title: group.title,
                items: group.items.map(function (item, index) {
                    const status = getStatus(disruption.id, group.key, index);
                    if (!UNCERTAINTY_STATUS_IDS.includes(status)) return null;
                    return {
                        label: item,
                        status: status,
                        statusLabel: getStatusLabel(status)
                    };
                }).filter(Boolean)
            };
        });
    }

    function hasUncertainty(disruption) {
        return getUncertaintyGroups(disruption).some(function (group) {
            return group.items.length;
        });
    }

    function renderMethodNote(note) {
        if (!note || !note.title) return '';

        return `
            <article class="dmg-method-note">
                <h4>${escapeHtml(note.title)}</h4>
                <p>${escapeHtml(note.description)}</p>
            </article>
        `;
    }

    function renderStaticSections() {
        if (methodOverviewEl) {
            methodOverviewEl.innerHTML = `
                <div class="dmg-method-summary">
                    <h3>${escapeHtml(workspaceData.methodology.title)}</h3>
                    <p>${escapeHtml(workspaceData.methodology.summary)}</p>
                </div>
                <div class="dmg-method-stage-flow" aria-label="Six-stage disruption mitigation pattern">
                    <div class="dmg-method-chevron-row">
                        ${workspaceData.methodology.stages.map(function (stage, index) {
                        const labelId = 'dmg-method-stage-' + stage.id + '-label';
                        const detailId = 'dmg-method-stage-' + stage.id + '-detail';
                        const shapePoints = index === 0
                            ? '1,1 88,1 99,24 88,47 1,47'
                            : '1,1 88,1 99,24 88,47 1,47 12,24';
                        return `
                            <button class="dmg-method-chevron" type="button" data-method-stage="${escapeHtml(stage.id)}" aria-labelledby="${escapeHtml(labelId)}" aria-controls="${escapeHtml(detailId)}" aria-expanded="false">
                                <span class="dmg-chevron-label" id="${escapeHtml(labelId)}">
                                    <svg class="dmg-chevron-shape" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                                        <polygon points="${escapeHtml(shapePoints)}"></polygon>
                                    </svg>
                                    <span class="dmg-chevron-number">${escapeHtml(stage.number)}</span>
                                    <strong>${escapeHtml(stage.title)}</strong>
                                </span>
                            </button>
                        `;
                        }).join('')}
                    </div>
                    <div class="dmg-method-stage-detail-region">
                        ${workspaceData.methodology.stages.map(function (stage) {
                            const detailId = 'dmg-method-stage-' + stage.id + '-detail';
                            return `
                                <article class="dmg-method-stage-detail" id="${escapeHtml(detailId)}" data-method-stage-detail="${escapeHtml(stage.id)}" hidden>
                                    <span>Stage ${escapeHtml(stage.number)}</span>
                                    <h4>${escapeHtml(stage.question)}</h4>
                                    <p>${escapeHtml(stage.description)}</p>
                                </article>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="dmg-method-notes">
                    ${renderMethodNote(workspaceData.methodology.roleOfTime)}
                </div>
            `;
        }

        if (useModesEl) {
            useModesEl.innerHTML = workspaceData.useModes.map(function (mode) {
                return `
                    <div class="dmg-use-mode">
                        <strong>${escapeHtml(mode.title)}</strong>
                        ${escapeHtml(mode.description)}
                    </div>
                `;
            }).join('');
        }
    }

    function getLifecycleDomainLabels() {
        return (workspaceData.lifecycleDomains || []).map(function (domain) {
            return typeof domain === 'string' ? domain : domain.title;
        }).filter(Boolean);
    }

    function getLifecycleDomainByTitle(title) {
        return (workspaceData.lifecycleDomains || []).find(function (domain) {
            return (typeof domain === 'string' ? domain : domain.title) === title;
        });
    }

    function getDomainsToCheckGroups(disruption) {
        const configured = disruption.domainsToCheck || {};
        const groups = [
            { label: 'Primary domains to check', titles: configured.primary || [] },
            { label: 'Secondary domains to check', titles: configured.secondary || [] }
        ].map(function (group) {
            return {
                label: group.label,
                titles: group.titles.filter(Boolean)
            };
        }).filter(function (group) {
            return group.titles.length;
        });

        if (groups.length) return groups;

        return [{
            label: 'Relationship prompts',
            titles: getLifecycleDomainLabels()
        }];
    }

    function normalizeDomainCheckText(value) {
        return String(value == null ? '' : value).toLowerCase();
    }

    function matchesDomainCheck(domainTitle, value) {
        const text = normalizeDomainCheckText(value);
        const keywords = DOMAIN_CHECK_KEYWORDS[domainTitle] || [domainTitle];
        return keywords.some(function (keyword) {
            return text.includes(normalizeDomainCheckText(keyword));
        });
    }

    function addDomainCheckPrompt(prompts, prompt) {
        const key = prompt.text.toLowerCase();
        if (prompts.some(function (item) { return item.text.toLowerCase() === key; })) return;
        prompts.push(prompt);
    }

    function buildDomainPromptList(disruption, domainTitle) {
        const sources = [
            { label: 'Traversal path', items: disruption.contextPath || [] },
            { label: 'Lifecycle Continuity data', group: 'lifecycleData', items: disruption.lifecycleData || [] },
            { label: 'Other required data', group: 'otherData', items: disruption.otherData || [] }
        ];
        const prompts = [];

        sources.forEach(function (source) {
            source.items.forEach(function (item, index) {
                if (!matchesDomainCheck(domainTitle, item)) return;
                const status = source.group ? getStatus(disruption.id, source.group, index) : '';
                addDomainCheckPrompt(prompts, {
                    source: source.label,
                    text: item,
                    statusLabel: status ? getStatusLabel(status) : ''
                });
            });
        });

        const domain = getLifecycleDomainByTitle(domainTitle);
        if (!prompts.length && domain && typeof domain !== 'string' && domain.description) {
            addDomainCheckPrompt(prompts, {
                source: 'Relationship prompt',
                text: domain.description,
                statusLabel: ''
            });
        }

        return prompts;
    }

    function buildLifecycleDomainChecks(disruption) {
        return getDomainsToCheckGroups(disruption).map(function (group) {
            return {
                label: group.label,
                checks: group.titles.map(function (title) {
                    return {
                        title: title,
                        prompts: buildDomainPromptList(disruption, title)
                    };
                }).filter(function (check) {
                    return check.title && check.prompts.length;
                })
            };
        }).filter(function (group) {
            return group.checks.length;
        });
    }

    function renderDomainCheckPrompts(check) {
        return `
            <div class="dmg-domain-check">
                <h6>${escapeHtml(check.title)}</h6>
                <ul class="dmg-list">
                    ${check.prompts.map(function (prompt) {
                        return `
                            <li>
                                <span class="dmg-domain-check-source">${escapeHtml(prompt.source)}</span>
                                ${prompt.statusLabel ? `<span class="dmg-status-tag">${escapeHtml(prompt.statusLabel)}</span>` : ''}
                                ${escapeHtml(prompt.text)}
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        `;
    }

    function renderLifecycleDomainChecks(disruption) {
        const groups = buildLifecycleDomainChecks(disruption);
        if (!groups.length) return '';

        return `
            <section class="dmg-summary-block dmg-full">
                <h5>Lifecycle relationship domains to check for this pathway</h5>
                <p>These are prompts derived from the selected disruption pathway, using its Lifecycle Continuity context and other required data checklist. They are not conclusions about what the disruption has touched. Use them to test whether the response has traced the right lifecycle relationships before closing the disruption.</p>
                <div class="dmg-domain-checks">
                    ${groups.map(function (group) {
                        return `
                            <div class="dmg-domain-check-group">
                                <strong>${escapeHtml(group.label)}</strong>
                                ${group.checks.map(renderDomainCheckPrompts).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;
    }

    function setActiveMethodStage(stageId) {
        if (!methodOverviewEl || !stageId) return;

        methodOverviewEl.querySelectorAll('[data-method-stage]').forEach(function (button) {
            const isActive = button.dataset.methodStage === stageId;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        methodOverviewEl.querySelectorAll('[data-method-stage-detail]').forEach(function (detail) {
            const isActive = detail.dataset.methodStageDetail === stageId;
            detail.classList.toggle('active', isActive);
            detail.hidden = !isActive;
        });
    }

    function clearActiveMethodStage() {
        if (!methodOverviewEl) return;

        methodOverviewEl.querySelectorAll('[data-method-stage]').forEach(function (button) {
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        });

        methodOverviewEl.querySelectorAll('[data-method-stage-detail]').forEach(function (detail) {
            detail.classList.remove('active');
            detail.hidden = true;
        });
    }

    function renderDisruptionList() {
        const term = (searchEl ? searchEl.value : '').trim().toLowerCase();
        const disruptions = workspaceData.disruptions.filter(function (item) {
            if (!term) return true;
            return JSON.stringify(item).toLowerCase().includes(term);
        });

        if (!disruptions.length) {
            listEl.innerHTML = `
                <div class="dmg-empty-state">
                    <h3>No matching disruption found</h3>
                    <p>Try another trigger, data item, decision or outcome.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = disruptions.map(function (item) {
            const isActive = item.id === selectedId;
            return `
                <button class="dmg-disruption-option${isActive ? ' active' : ''}" type="button" data-disruption-id="${escapeHtml(item.id)}" aria-pressed="${isActive ? 'true' : 'false'}">
                    <strong>${escapeHtml(item.shortTitle)}</strong>
                    <span>${escapeHtml(item.trigger)}</span>
                </button>
            `;
        }).join('');
    }

    function renderWorkspace() {
        const workspace = getWorkspace();
        if (!workspace) return;

        const disruption = selectedDisruption();
        workspace.innerHTML = `
            <div class="dmg-workspace-inner">
                ${renderActivationHeader(disruption)}
                ${renderModeTabs()}
                ${renderModeContent(disruption)}
                ${summaryVisible ? renderSessionSummary(disruption) : ''}
            </div>
        `;
    }

    function renderActivationHeader(disruption) {
        return `
            <section class="dmg-activation-header">
                <div class="dmg-header-grid">
                    <div>
                        <div class="dmg-eyebrow">Selected pathway</div>
                        <h3>${escapeHtml(disruption.title)}</h3>
                        <p class="dmg-pathway-subtitle">${escapeHtml(disruption.subtitle)}</p>
                        ${disruption.description ? `<p class="dmg-pathway-description">${escapeHtml(disruption.description)}</p>` : ''}
                    </div>
                    <div class="dmg-meta-stack">
                        <div class="dmg-trigger-box">
                            <strong>Activation trigger</strong>
                            <span>${escapeHtml(disruption.trigger)}</span>
                        </div>
                        <div class="dmg-meta-item">
                            <strong>Continuity question</strong>
                            <span>${escapeHtml(disruption.continuityQuestion)}</span>
                        </div>
                        <div class="dmg-meta-item">
                            <strong>Target outcome</strong>
                            <span>${escapeHtml(disruption.outcome)}</span>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    function renderModeTabs() {
        const modes = [
            { id: 'navigate', label: 'Navigate', icon: 'bi-compass' },
            { id: 'guidance', label: 'Guidance', icon: 'bi-journal-text' },
            { id: 'activation', label: 'Activation', icon: 'bi-lightning-charge' }
        ];

        return `
            <div class="dmg-mode-tabs" role="tablist" aria-label="Workspace mode">
                ${modes.map(function (mode) {
                    const isActive = activeMode === mode.id;
                    return `
                        <button class="dmg-mode-tab${isActive ? ' active' : ''}" type="button" data-mode="${mode.id}" role="tab" aria-selected="${isActive ? 'true' : 'false'}">
                            <i class="bi ${mode.icon}" aria-hidden="true"></i>
                            ${escapeHtml(mode.label)}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderModeContent(disruption) {
        if (activeMode === 'guidance') {
            return renderGuidance(disruption);
        }

        if (activeMode === 'activation') {
            return renderActivationCard(disruption);
        }

        return renderNavigate(disruption);
    }

    function renderStageTabs() {
        return `
            <div class="dmg-stage-tabs" role="tablist" aria-label="Mitigation stage">
                ${workspaceData.methodology.stages.map(function (stage, index) {
                    const isActive = activeStage === index;
                    return `
                        <button class="dmg-stage-tab${isActive ? ' active' : ''}" type="button" data-stage="${index}" role="tab" aria-selected="${isActive ? 'true' : 'false'}">
                            <span>${escapeHtml(stage.number)}</span>
                            <strong>${escapeHtml(stage.shortTitle)}</strong>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderNavigate(disruption) {
        const stage = workspaceData.methodology.stages[activeStage] || workspaceData.methodology.stages[0];

        return `
            ${renderStageTabs()}
            <div class="dmg-content-grid">
                <section class="dmg-panel">
                    <h4>${escapeHtml(stage.title)}</h4>
                    <p>${escapeHtml(stage.description)}</p>
                    ${renderStagePrimary(disruption, stage.id)}
                </section>
                <aside class="dmg-panel">
                    <h4>Information confidence</h4>
                    ${renderStateSummary(disruption)}
                    <p>${escapeHtml(disruption.objective)}</p>
                    <div class="dmg-summary-action">
                        <button class="dmg-inline-action" type="button" data-summary-toggle>
                            <i class="bi ${summaryVisible ? 'bi-eye-slash' : 'bi-clipboard-check'}" aria-hidden="true"></i>
                            ${summaryVisible ? 'Hide disruption summary' : 'Generate response summary'}
                        </button>
                        <span>Summary reflects practitioner-entered information states and does not independently verify data.</span>
                    </div>
                </aside>
            </div>
        `;
    }

    function renderStagePrimary(disruption, stageId) {
        if (stageId === 'disruption') {
            return `
                <div class="dmg-trigger-box">
                    <strong>Trigger</strong>
                    <span>${escapeHtml(disruption.trigger)}</span>
                </div>
                <div class="dmg-subsection">
                    <h4>Lifecycle entry points</h4>
                    <p class="dmg-entry-point-intro">Lifecycle entry points are the identifiers or known conditions used to enter the connected lifecycle and trace what the disruption touches. Start with the most specific reliable entry point available, then follow its relationships to affected materials, products, movements, evidence, obligations and commitments.</p>
                    ${renderStartKeys(disruption.startKeys)}
                </div>
            `;
        }

        if (stageId === 'lifecycle-context') {
            return `
                <h4>Traversal path</h4>
                ${renderContextPath(disruption.contextPath)}
                <div class="dmg-subsection-wrap">
                    ${renderDataGroup(disruption, 'lifecycleData', 'Lifecycle Continuity data', disruption.lifecycleData, disruption.lifecycleDataUse)}
                </div>
            `;
        }

        if (stageId === 'other-data') {
            return renderDataGroup(disruption, 'otherData', 'Other required data', disruption.otherData, disruption.otherDataUse);
        }

        if (stageId === 'decision') {
            return renderDecisionStage(disruption);
        }

        if (stageId === 'response') {
            return `
                <div class="dmg-trigger-box">
                    <strong>Operational response</strong>
                    <span>${escapeHtml(disruption.operationalActions)}</span>
                </div>
                <div class="dmg-subsection">
                    <h4>Response weaknesses</h4>
                    ${renderList(disruption.responseWeaknesses)}
                </div>
            `;
        }

        return `
                <div class="dmg-trigger-box">
                    <strong>Continuity outcome</strong>
                    <span>${escapeHtml(disruption.outcome)}</span>
                </div>
            <div class="dmg-subsection">
                <h4>Practitioner questions</h4>
                ${renderList(disruption.practitionerQuestions)}
            </div>
        `;
    }

    function renderDecisionStage(disruption) {
        const model = disruption.decisionModel || {};
        const owner = getDecision(disruption.id, 'owner');
        const approvals = getDecision(disruption.id, 'approvals');
        const latestUsefulDecisionTime = getDecision(disruption.id, 'latestUsefulDecisionTime');

        return `
            <div class="dmg-decision-panel">
                <section class="dmg-decision-card dmg-full">
                    <span>Decision pending</span>
                    <p>${escapeHtml(disruption.decisionRequirements)}</p>
                </section>
                <section class="dmg-decision-card dmg-full">
                    <span>Decision question</span>
                    <p>${escapeHtml(model.question || '')}</p>
                </section>
                <section class="dmg-decision-card">
                    <span>Decision owner</span>
                    <p class="dmg-decision-prompt">${escapeHtml(model.ownerPrompt || 'Who owns this decision?')}</p>
                    <label class="dmg-decision-field">
                        <input type="text" data-decision-field="owner" value="${escapeHtml(owner)}" placeholder="Enter decision owner">
                    </label>
                </section>
                <section class="dmg-decision-card">
                    <span>Required approvals</span>
                    <p class="dmg-decision-prompt">${escapeHtml(model.approvalsPrompt || 'Which approvals or authorities are required?')}</p>
                    <label class="dmg-decision-field">
                        <textarea rows="3" data-decision-field="approvals" placeholder="Enter required approvals">${escapeHtml(approvals)}</textarea>
                    </label>
                </section>
                <section class="dmg-decision-card">
                    <span>Latest useful decision time</span>
                    <p class="dmg-decision-prompt">${escapeHtml(model.decisionTimePrompt || 'When does this decision stop protecting the commitment?')}</p>
                    <label class="dmg-decision-field">
                        <input type="text" data-decision-field="latestUsefulDecisionTime" value="${escapeHtml(latestUsefulDecisionTime)}" placeholder="Enter decision time">
                    </label>
                </section>
                <section class="dmg-decision-card">
                    <span>Decision criteria</span>
                    ${renderList(model.criteria || [])}
                </section>
                <section class="dmg-decision-card dmg-full">
                    <span>Unresolved uncertainty</span>
                    ${renderUncertaintyGroups(disruption)}
                </section>
            </div>
        `;
    }

    function renderUncertaintyGroups(disruption) {
        const groups = getUncertaintyGroups(disruption);

        if (!hasUncertainty(disruption)) {
            return '<p class="dmg-muted-note">No Lifecycle Continuity or other required data is currently marked assumed, missing or conflicting.</p>';
        }

        return `
            <div class="dmg-uncertainty-groups">
                ${groups.map(function (group) {
                    return `
                        <div class="dmg-uncertainty-group">
                            <strong>${escapeHtml(group.title)}</strong>
                            ${group.items.length ? `
                                <ul class="dmg-list">
                                    ${group.items.map(function (item) {
                                        return `<li><span class="dmg-status-tag">${escapeHtml(item.statusLabel)}</span>${escapeHtml(item.label)}</li>`;
                                    }).join('')}
                                </ul>
                            ` : '<p class="dmg-muted-note">None currently marked.</p>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderStartKeys(keys) {
        return `
            <div class="dmg-start-key-grid">
                ${keys.map(function (key) {
                    return `<span class="dmg-start-key">${escapeHtml(key)}</span>`;
                }).join('')}
            </div>
        `;
    }

    function renderContextPath(path) {
        return `
            <div class="dmg-path">
                ${path.map(function (item, index) {
                    return `
                        <span class="dmg-path-chip">${escapeHtml(item)}</span>
                        ${index < path.length - 1 ? '<span class="dmg-path-arrow" aria-hidden="true">/</span>' : ''}
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderStateSummary(disruption) {
        const counts = countStatuses(disruption);
        return `
            <div class="dmg-state-summary">
                ${workspaceData.informationStatuses.map(function (status) {
                    return `
                        <div class="dmg-state-count">
                            <strong>${escapeHtml(counts[status.id] || 0)}</strong>
                            <span>${escapeHtml(status.label)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderDataGroup(disruption, group, title, items, useText) {
        return `
            <section class="dmg-data-group">
                <div class="dmg-data-group-head">
                    <h4>${escapeHtml(title)}</h4>
                    <span>${escapeHtml(items.length)} items</span>
                </div>
                <div class="dmg-data-use">
                    <p>${escapeHtml(useText)}</p>
                </div>
                ${items.map(function (item, index) {
                    return `
                        <div class="dmg-data-row">
                            <div class="dmg-data-label">${escapeHtml(item)}</div>
                            ${renderStatusControls(disruption.id, group, index)}
                        </div>
                    `;
                }).join('')}
            </section>
        `;
    }

    function renderStatusControls(disruptionId, group, index) {
        const current = getStatus(disruptionId, group, index);
        return `
            <div class="dmg-status-controls" aria-label="Information status">
                ${workspaceData.informationStatuses.map(function (status) {
                    const isActive = current === status.id;
                    return `
                        <button class="dmg-status-button${isActive ? ' active' : ''}" type="button" data-status="${escapeHtml(status.id)}" data-group="${escapeHtml(group)}" data-index="${index}" aria-pressed="${isActive ? 'true' : 'false'}" title="${escapeHtml(status.description)}">
                            ${escapeHtml(status.label)}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderGuidance(disruption) {
        return `
            <div class="dmg-guidance-grid">
                <section class="dmg-panel">
                    <h4>Why response weakens</h4>
                    ${renderList(disruption.responseWeaknesses)}
                </section>
                <section class="dmg-panel">
                    <h4>Reusable pattern</h4>
                    ${renderPattern(disruption.pattern)}
                </section>
                <section class="dmg-panel">
                    <h4>Lifecycle Continuity data</h4>
                    <div class="dmg-guidance-block">
                        <h5>What Lifecycle Continuity data can tell us</h5>
                        ${renderList(disruption.lifecycleData)}
                    </div>
                    <div class="dmg-guidance-use">
                        <h5>How this data is used</h5>
                        <p>${escapeHtml(disruption.lifecycleDataUse)}</p>
                    </div>
                </section>
                <section class="dmg-panel">
                    <h4>Other required data</h4>
                    <div class="dmg-guidance-block">
                        <h5>What other data is needed</h5>
                        ${renderList(disruption.otherData)}
                    </div>
                    <div class="dmg-guidance-use">
                        <h5>How this data is used</h5>
                        <p>${escapeHtml(disruption.otherDataUse)}</p>
                    </div>
                </section>
                <section class="dmg-panel dmg-full">
                    <h4>Practitioner questions</h4>
                    ${renderList(disruption.practitionerQuestions)}
                </section>
            </div>
        `;
    }

    function renderPattern(pattern) {
        const labels = [
            ['disruption', 'Disruption'],
            ['lifecycleContext', 'Lifecycle context'],
            ['otherData', 'Other data'],
            ['decision', 'Decision'],
            ['response', 'Response'],
            ['outcome', 'Outcome']
        ];

        return `
            <ul class="dmg-list">
                ${labels.map(function (entry) {
                    return `<li><strong>${escapeHtml(entry[1])}:</strong> ${escapeHtml(pattern[entry[0]])}</li>`;
                }).join('')}
            </ul>
        `;
    }

    function renderSessionSummary(disruption) {
        const counts = countStatuses(disruption);
        const owner = getDecision(disruption.id, 'owner');
        const approvals = getDecision(disruption.id, 'approvals');
        const latestUsefulDecisionTime = getDecision(disruption.id, 'latestUsefulDecisionTime');
        const decisionQuestion = disruption.decisionModel && disruption.decisionModel.question ? disruption.decisionModel.question : 'Not specified';

        return `
            <section class="dmg-summary-panel" id="dmgSummaryPanel">
                <div class="dmg-summary-head">
                    <div>
                        <h4>Disruption response summary</h4>
                        <p>Reflects practitioner-entered information states and does not independently verify the underlying data.</p>
                    </div>
                    <button class="dmg-inline-action" type="button" data-copy-summary>
                        <i class="bi bi-clipboard" aria-hidden="true"></i>
                        Copy summary
                    </button>
                </div>
                <div class="dmg-summary-grid">
                    <section class="dmg-summary-block">
                        <h5>Selected disruption</h5>
                        <p><strong>${escapeHtml(disruption.title)}</strong></p>
                        <p>${escapeHtml(disruption.trigger)}</p>
                        <p><strong>Continuity question:</strong> ${escapeHtml(disruption.continuityQuestion)}</p>
                        <p><strong>Target outcome:</strong> ${escapeHtml(disruption.outcome)}</p>
                    </section>
                    <section class="dmg-summary-block">
                        <h5>Information confidence</h5>
                        <ul class="dmg-compact-list">
                            ${workspaceData.informationStatuses.map(function (status) {
                                return `<li><span>${escapeHtml(status.label)}</span><strong>${escapeHtml(counts[status.id] || 0)}</strong></li>`;
                            }).join('')}
                        </ul>
                    </section>
                    <section class="dmg-summary-block">
                        <h5>Decision status</h5>
                        <p><strong>Decision pending:</strong> ${escapeHtml(disruption.decisionRequirements)}</p>
                        <p><strong>Decision question:</strong> ${escapeHtml(decisionQuestion)}</p>
                        <p><strong>Decision owner:</strong> ${escapeHtml(owner || 'Not entered')}</p>
                        <p><strong>Required approvals:</strong> ${escapeHtml(approvals || 'Not entered')}</p>
                        <p><strong>Latest useful decision time:</strong> ${escapeHtml(latestUsefulDecisionTime || 'Not entered')}</p>
                    </section>
                    <section class="dmg-summary-block dmg-full">
                        <h5>Key uncertainty</h5>
                        ${renderUncertaintyGroups(disruption)}
                    </section>
                    <section class="dmg-summary-block">
                        <h5>Operational response</h5>
                        <p>${escapeHtml(disruption.operationalActions)}</p>
                    </section>
                    <section class="dmg-summary-block">
                        <h5>Escalation condition</h5>
                        <p>${escapeHtml(disruption.activationCard.escalateIf)}</p>
                    </section>
                    <section class="dmg-summary-block dmg-full">
                        <h5>Continuity objective</h5>
                        <p><strong>${escapeHtml(disruption.outcome)}:</strong> ${escapeHtml(disruption.objective)}</p>
                    </section>
                    ${renderLifecycleDomainChecks(disruption)}
                </div>
            </section>
        `;
    }

    function buildSummaryText(disruption) {
        const counts = countStatuses(disruption);
        const owner = getDecision(disruption.id, 'owner') || 'Not entered';
        const approvals = getDecision(disruption.id, 'approvals') || 'Not entered';
        const latestUsefulDecisionTime = getDecision(disruption.id, 'latestUsefulDecisionTime') || 'Not entered';
        const decisionQuestion = disruption.decisionModel && disruption.decisionModel.question ? disruption.decisionModel.question : 'Not specified';
        const uncertaintyGroups = getUncertaintyGroups(disruption);
        const lines = [
            'Lifecycle Continuity Disruption Response Summary',
            '',
            'This summary reflects practitioner-entered information states and does not independently verify the underlying data.',
            '',
            'Selected disruption',
            '- ' + disruption.title,
            '- Activation trigger: ' + disruption.trigger,
            '- Continuity question: ' + disruption.continuityQuestion,
            '- Target outcome: ' + disruption.outcome,
            '',
            'Information confidence'
        ];

        workspaceData.informationStatuses.forEach(function (status) {
            lines.push('- ' + status.label + ': ' + (counts[status.id] || 0));
        });

        lines.push(
            '',
            'Decision status',
            '- Decision pending: ' + disruption.decisionRequirements,
            '- Decision question: ' + decisionQuestion,
            '- Decision owner: ' + owner,
            '- Required approvals: ' + approvals,
            '- Latest useful decision time: ' + latestUsefulDecisionTime,
            '',
            'Key uncertainty'
        );

        uncertaintyGroups.forEach(function (group) {
            lines.push(group.title + ':');
            if (!group.items.length) {
                lines.push('- None currently marked.');
            } else {
                group.items.forEach(function (item) {
                    lines.push('- [' + item.statusLabel + '] ' + item.label);
                });
            }
        });

        lines.push(
            '',
            'Operational response',
            disruption.operationalActions,
            '',
            'Escalation condition',
            disruption.activationCard.escalateIf,
            '',
            'Continuity objective',
            disruption.outcome + ': ' + disruption.objective
        );

        const lifecycleDomainChecks = buildLifecycleDomainChecks(disruption);
        if (lifecycleDomainChecks.length) {
            lines.push(
                '',
                'Lifecycle relationship domains to check for this pathway',
                'These are prompts derived from the selected disruption pathway, using its Lifecycle Continuity context and other required data checklist. They are not conclusions about what the disruption has touched. Use them to test whether the response has traced the right lifecycle relationships before closing the disruption.'
            );

            lifecycleDomainChecks.forEach(function (group) {
                lines.push('', group.label);
                group.checks.forEach(function (check) {
                    lines.push(check.title);
                    check.prompts.forEach(function (prompt) {
                        const statusText = prompt.statusLabel ? ' [' + prompt.statusLabel + ']' : '';
                        lines.push('- [' + prompt.source + ']' + statusText + ' ' + prompt.text);
                    });
                });
            });
        }

        return lines.join('\n');
    }

    function copyText(value) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(value);
        }

        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return Promise.resolve();
    }

    function renderActivationCard(disruption) {
        return `
            <section class="dmg-panel">
                <h4>Activation card</h4>
                <p>${escapeHtml(disruption.trigger)}</p>
                <div class="dmg-activation-table">
                    ${disruption.activationCard.steps.map(function (step, index) {
                        return `
                            <div class="dmg-activation-step">
                                <strong>${escapeHtml(index + 1)}. ${escapeHtml(step.element)}</strong>
                                <p>${escapeHtml(step.action)}</p>
                                <span>${escapeHtml(step.record)}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
            <section class="dmg-escalation">
                <h4>Escalate immediately if</h4>
                <p>${escapeHtml(disruption.activationCard.escalateIf)}</p>
            </section>
        `;
    }

    function renderList(items) {
        return `
            <ul class="dmg-list">
                ${items.map(function (item) {
                    return `<li>${escapeHtml(item)}</li>`;
                }).join('')}
            </ul>
        `;
    }

    function setSelected(id) {
        selectedId = id;
        activeStage = 0;
        summaryVisible = false;
        renderDisruptionList();
        renderWorkspace();
        track('disruption_pathway_selected', selectedDisruption().title);
    }

    function bindEvents() {
        document.addEventListener('click', function (event) {
            const routedWorkspaceControl = coveredWorkspaceControl(event);
            if (routedWorkspaceControl) {
                event.preventDefault();
                event.stopPropagation();
                autoCloseWorkspaceHelp('covered workspace control');
                routedWorkspaceControl.click();
                if (typeof routedWorkspaceControl.focus === 'function') {
                    routedWorkspaceControl.focus({ preventScroll: true });
                }
                return;
            }

            const workspaceHelpToggle = event.target.closest('#dmgWorkspaceHelpButton');
            if (workspaceHelpToggle) {
                if (workspaceHelpIsOpen()) {
                    closeWorkspaceHelp({ label: 'button' });
                } else {
                    openWorkspaceHelp();
                }
                return;
            }

            const workspaceHelpCloseButton = event.target.closest('#dmgWorkspaceHelpClose');
            if (workspaceHelpCloseButton) {
                closeWorkspaceHelp({ label: 'close button' });
                return;
            }

            const disruptionButton = event.target.closest('[data-disruption-id]');
            if (disruptionButton) {
                autoCloseWorkspaceHelp('disruption selected');
                setSelected(disruptionButton.dataset.disruptionId);
                return;
            }

            const methodStageButton = event.target.closest('[data-method-stage]');
            if (methodStageButton) {
                setActiveMethodStage(methodStageButton.dataset.methodStage);
                return;
            }

            const copySummaryButton = event.target.closest('[data-copy-summary]');
            if (copySummaryButton) {
                autoCloseWorkspaceHelp('summary copied');
                copyText(buildSummaryText(selectedDisruption())).then(function () {
                    copySummaryButton.textContent = 'Copied summary';
                    window.setTimeout(function () {
                        copySummaryButton.innerHTML = '<i class="bi bi-clipboard" aria-hidden="true"></i> Copy summary';
                    }, 1400);
                    track('disruption_summary_copied', selectedDisruption().title);
                }).catch(function () {
                    copySummaryButton.textContent = 'Copy failed';
                });
                return;
            }

            const summaryToggleButton = event.target.closest('[data-summary-toggle]');
            if (summaryToggleButton) {
                autoCloseWorkspaceHelp('summary toggled');
                summaryVisible = !summaryVisible;
                renderWorkspace();
                track('disruption_summary_toggled', summaryVisible ? 'open' : 'closed');
                return;
            }

            const modeButton = event.target.closest('[data-mode]');
            if (modeButton) {
                autoCloseWorkspaceHelp('mode selected');
                activeMode = modeButton.dataset.mode;
                renderWorkspace();
                track('workspace_mode_selected', activeMode);
                return;
            }

            const stageButton = event.target.closest('[data-stage]');
            if (stageButton) {
                autoCloseWorkspaceHelp('stage selected');
                activeStage = Number(stageButton.dataset.stage) || 0;
                renderWorkspace();
                track('workspace_stage_selected', workspaceData.methodology.stages[activeStage].title);
                return;
            }

            const statusButton = event.target.closest('[data-status]');
            if (statusButton) {
                autoCloseWorkspaceHelp('information status selected');
                const disruption = selectedDisruption();
                setStatus(disruption.id, statusButton.dataset.group, Number(statusButton.dataset.index), statusButton.dataset.status);
                renderWorkspace();
                track('information_status_selected', statusButton.dataset.status);
            }
        });

        document.addEventListener('input', function (event) {
            const decisionField = event.target.closest('[data-decision-field]');
            if (!decisionField) return;

            autoCloseWorkspaceHelp('decision field edited');
            setDecision(selectedId, decisionField.dataset.decisionField, decisionField.value);

            if (summaryVisible) {
                const summaryPanel = document.getElementById('dmgSummaryPanel');
                if (summaryPanel) {
                    summaryPanel.outerHTML = renderSessionSummary(selectedDisruption());
                }
            }
        });

        document.addEventListener('mouseover', function (event) {
            const methodStageButton = event.target.closest('[data-method-stage]');
            if (methodStageButton) {
                setActiveMethodStage(methodStageButton.dataset.methodStage);
            }
        });

        document.addEventListener('mouseout', function (event) {
            const methodFlow = event.target.closest('.dmg-method-stage-flow');
            if (methodFlow && (!event.relatedTarget || !methodFlow.contains(event.relatedTarget))) {
                clearActiveMethodStage();
            }
        });

        document.addEventListener('focusin', function (event) {
            const methodStageButton = event.target.closest('[data-method-stage]');
            if (methodStageButton) {
                setActiveMethodStage(methodStageButton.dataset.methodStage);
            }
        });

        document.addEventListener('focusout', function (event) {
            const methodFlow = event.target.closest('.dmg-method-stage-flow');
            if (methodFlow && (!event.relatedTarget || !methodFlow.contains(event.relatedTarget))) {
                clearActiveMethodStage();
            }
        });

        if (searchEl) {
            searchEl.addEventListener('input', function () {
                autoCloseWorkspaceHelp('search used');
                renderDisruptionList();
            });
        }

        if (resetEl) {
            resetEl.addEventListener('click', function () {
                autoCloseWorkspaceHelp('workspace reset');
                session = {
                    version: SESSION_VERSION,
                    statuses: {},
                    decisions: {}
                };
                statuses = session.statuses;
                decisions = session.decisions;
                summaryVisible = false;
                try {
                    window.localStorage.removeItem(LEGACY_STATUS_KEY);
                } catch (error) {
                    // Ignore storage cleanup failures.
                }
                saveSession();
                renderWorkspace();
                track('information_status_reset', 'All session state');
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && workspaceHelpIsOpen()) {
                closeWorkspaceHelp({ label: 'escape key' });
            }
        });
    }

    async function init() {
        if (!app) return;

        try {
            const response = await fetch(DATA_PATH);
            if (!response.ok) {
                throw new Error('Unable to load workspace data.');
            }

            workspaceData = await response.json();
            selectedId = workspaceData.disruptions[0].id;
            renderStaticSections();
            renderDisruptionList();
            renderWorkspace();
            bindEvents();
        } catch (error) {
            const workspace = getWorkspace();
            if (workspace) {
                workspace.innerHTML = `
                    <div class="dmg-empty-state">
                        <h3>Unable to load the workspace data</h3>
                        <p>Please check <code>${escapeHtml(DATA_PATH)}</code>.</p>
                    </div>
                `;
            } else if (loadingState) {
                loadingState.innerHTML = '<h3>Unable to load the workspace data</h3>';
            }
            console.error(error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
