import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PageSection,
  PageSectionVariants,
  Title,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  SearchInput,
  Alert,
  AlertGroup,
  ActionGroup,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Skeleton,
  Content,
  Flex,
  FlexItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Divider,
  Tooltip,
  Label,
  Pagination,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  MenuToggleCheckbox,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import {
  LockIcon,
  PlusCircleIcon,
  TrashIcon,
  SyncAltIcon,
  CubeIcon,
  PencilAltIcon,
} from '@patternfly/react-icons';
import {
  getSkills,
  searchSkills,
  addSource,
  updateSource,
  syncSource,
  deleteSkill,
  getSources,
  deleteSource,

  syncSources,
} from '../../api/client';
import type { Skill, SkillSource } from '../../api/types';
import InstallCommand from '../../components/InstallCommand';
import { categoryColor } from '../../utils/category';

const SESSION_KEY = 'rhess_admin_token';
const storage = localStorage;

function buildSourceUrl(path: string): string | null {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (/^[\w.-]+\/[\w.-]+$/.test(path)) return `https://github.com/${path}`;
  return null;
}

interface Toast {
  id: number;
  variant: 'success' | 'danger' | 'info';
  title: string;
  body?: string;
}

let toastId = 0;

const AdminPage: React.FC = () => {
  const [token, setToken] = useState<string>(() => storage.getItem(SESSION_KEY) ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  const [skills, setSkills] = useState<Skill[]>([]);
  const [sources, setSources] = useState<SkillSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [splitBulkOpen, setSplitBulkOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Sorting
  type SortCol = 'name' | 'lastSynced';
  type SortDir = 'asc' | 'desc';
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Login modal
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register source modal
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPath, setNewPath] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit source modal (per skill row)
  const [editTarget, setEditTarget] = useState<SkillSource | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete skill modal
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = (variant: Toast['variant'], title: string, body?: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, variant, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  const loadData = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const [skillsRes, sourcesRes] = await Promise.all([
        q.trim() ? searchSkills(q.trim()).then((r) => ({ skills: r.skills })) : getSkills({ per_page: 100 }),
        getSources(),
      ]);
      setSkills(skillsRes.skills);
      setSources(sourcesRes.sources);
    } catch (err: unknown) {
      addToast('danger', 'Could not load skills', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      await syncSources(loginInput);
      storage.setItem(SESSION_KEY, loginInput);
      setToken(loginInput);
      setIsAuthenticated(true);
      setLoginOpen(false);
      setLoginInput('');
      loadData(search);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes('unauthorized')) {
        setLoginError('Invalid token. Check the server startup logs.');
      } else {
        storage.setItem(SESSION_KEY, loginInput);
        setToken(loginInput);
        setIsAuthenticated(true);
        setLoginOpen(false);
        setLoginInput('');
        loadData(search);
      }
    }
  };

  const handleLogout = () => {
    storage.removeItem(SESSION_KEY);
    setToken('');
    setIsAuthenticated(false);
    setSkills([]);
  };

  useEffect(() => {
    if (token) {
      getSources()
        .then(({ sources }) => {
          setSources(sources);
          setIsAuthenticated(true);
          loadData();
        })
        .catch(() => {
          syncSources(token).catch((err) => {
            if ((err as Error).message?.toLowerCase().includes('unauthorized')) {
              storage.removeItem(SESSION_KEY);
              setToken('');
            } else {
              setIsAuthenticated(true);
              loadData();
            }
          });
        });
    }
  }, []); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadData(search), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]); // eslint-disable-line

  const handleRowSync = async (skill: Skill) => {
    const source = sources.find((s) => s.id === skill.sourceId);
    if (!source) return;
    setSyncingId(skill.sourceId);
    try {
      await syncSource(token, source.id);
      addToast('success', `Synced "${source.label}"`);
      loadData(search);
    } catch (err: unknown) {
      addToast('danger', 'Sync failed', (err as Error).message);
    } finally {
      setSyncingId(null);
    }
  };

  const openEdit = (skill: Skill) => {
    const source = sources.find((s) => s.id === skill.sourceId);
    if (!source) return;
    setEditTarget(source);
    setEditLabel(source.label);
    setEditPath(source.path);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updateSource(token, editTarget.id, { path: editPath.trim(), label: editLabel.trim() });
      addToast('success', `"${editLabel}" updated`);
      setEditTarget(null);
      loadData(search);
    } catch (err: unknown) {
      addToast('danger', 'Update failed', (err as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddSource = async () => {
    setAddError('');
    if (!newPath.trim() || !newLabel.trim()) {
      setAddError('Both Name and Source are required.');
      return;
    }
    setAddLoading(true);
    try {
      await addSource(token, { path: newPath.trim(), label: newLabel.trim() });
      addToast('success', `Source "${newLabel}" registered — cloning in background`);
      setAddOpen(false);
      setNewPath('');
      setNewLabel('');
      loadData(search);
    } catch (err: unknown) {
      setAddError((err as Error).message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      // Try to delete the source if it exists, else just the skill file
      const source = sources.find((s) => s.id === deleteTarget.sourceId);
      if (source) {
        await deleteSource(token, source.id);
        addToast('success', `Removed "${deleteTarget.name}" and its source`);
      } else {
        await deleteSkill(token, deleteTarget.id);
        addToast('success', `Deleted "${deleteTarget.name}"`);
      }
      setDeleteTarget(null);
      loadData(search);
    } catch (err: unknown) {
      addToast('danger', 'Delete failed', (err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Relative time formatter
  const relativeTime = (iso?: string): string => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  // Sort then paginate
  const sortedSkills = [...skills].sort((a, b) => {
    if (sortCol === 'name') {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    // lastSynced — Never sinks to the bottom regardless of direction
    const srcA = sources.find((s) => s.id === a.sourceId);
    const srcB = sources.find((s) => s.id === b.sourceId);
    const tA = srcA?.lastSynced ? new Date(srcA.lastSynced).getTime() : null;
    const tB = srcB?.lastSynced ? new Date(srcB.lastSynced).getTime() : null;
    if (tA === null && tB === null) return 0;
    if (tA === null) return 1;
    if (tB === null) return -1;
    return sortDir === 'asc' ? tA - tB : tB - tA;
  });
  const pageSkills = sortedSkills.slice((page - 1) * perPage, page * perPage);

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleSelectNone = () => setSelected(new Set());
  const handleSelectPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageSkills.forEach((s) => next.add(s.id));
      return next;
    });
  const handleSelectAll = () => setSelected(new Set(skills.map((s) => s.id)));

  const allSelected = skills.length > 0 && selected.size === skills.length;
  const someSelected = selected.size > 0 && !allSelected;

  const handleBulkSelectorCheck = (_checked: boolean) => {
    if (allSelected || someSelected) handleSelectNone();
    else handleSelectAll();
  };

  const handleBulkSync = async () => {
    setBulkSyncing(true);
    try {
      const sourceIds = new Set(
        skills.filter((s) => selected.has(s.id)).map((s) => s.sourceId)
      );
      await Promise.all([...sourceIds].map((id) => syncSource(token, id)));
      addToast('success', `Synced ${selected.size} skill${selected.size !== 1 ? 's' : ''}`);
      loadData(search);
    } catch (err: unknown) {
      addToast('danger', 'Sync failed', (err as Error).message);
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map((id) => deleteSkill(token, id)));
      addToast('success', `Deleted ${selected.size} skill${selected.size !== 1 ? 's' : ''}`);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      loadData(search);
    } catch (err: unknown) {
      addToast('danger', 'Delete failed', (err as Error).message);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <>
      {toasts.length > 0 && (
        <AlertGroup isToast isLiveRegion>
          {toasts.map((t) => (
            <Alert key={t.id} variant={t.variant} title={t.title} timeout={5000} actionClose={<></>}>
              {t.body}
            </Alert>
          ))}
        </AlertGroup>
      )}

      <PageSection variant={PageSectionVariants.secondary} isWidthLimited>
        <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <Title headingLevel="h1" size="2xl">Admin</Title>
            <Content component="p" style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              Control your skill catalog from here — register new sources, sync the latest content from Git, and remove what you no longer need.
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
              {isAuthenticated && (
                <Button variant="secondary" size="sm" onClick={handleLogout}>Sign out</Button>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection variant={PageSectionVariants.secondary} padding={{ default: 'noPadding' }}>
        <Divider />
      </PageSection>

      {/* Unauthenticated state */}
      {!isAuthenticated && (
        <PageSection>
          <EmptyState headingLevel="h2" titleText="Admin access required" icon={LockIcon}>
            <EmptyStateBody>
              Sign in with your admin token to manage skills and sources.
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={() => setLoginOpen(true)}>Sign in as admin</Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </PageSection>
      )}

      {/* Skills management table */}
      {isAuthenticated && (
        <PageSection variant={PageSectionVariants.default}>
          <Toolbar>
            <ToolbarContent>
              {/* PF bulk selector: split button (checkbox + dropdown) */}
              <ToolbarItem>
                <Dropdown
                  isOpen={splitBulkOpen}
                  onOpenChange={(open) => setSplitBulkOpen(open)}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setSplitBulkOpen(!splitBulkOpen)}
                      isExpanded={splitBulkOpen}
                      splitButtonItems={[
                        <MenuToggleCheckbox
                          id="bulk-selector-checkbox"
                          key="bulk-selector-checkbox"
                          aria-label={allSelected ? 'Deselect all' : 'Select all'}
                          isChecked={allSelected ? true : someSelected ? null : false}
                          onChange={handleBulkSelectorCheck}
                        >
                          {selected.size > 0 ? `${selected.size} selected` : undefined}
                        </MenuToggleCheckbox>,
                      ]}
                      aria-label="Bulk select"
                    />
                  )}
                >
                  <DropdownList>
                    <DropdownItem
                      key="select-none"
                      onClick={() => { handleSelectNone(); setSplitBulkOpen(false); }}
                      isDisabled={selected.size === 0}
                    >
                      Select none {selected.size > 0 && `(${selected.size} items)`}
                    </DropdownItem>
                    <DropdownItem
                      key="select-page"
                      onClick={() => { handleSelectPage(); setSplitBulkOpen(false); }}
                    >
                      Select page ({pageSkills.length} items)
                    </DropdownItem>
                    <DropdownItem
                      key="select-all"
                      onClick={() => { handleSelectAll(); setSplitBulkOpen(false); }}
                      isDisabled={allSelected}
                    >
                      Select all ({skills.length} items)
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>

              <ToolbarItem>
                <SearchInput
                  placeholder="Search skills…"
                  value={search}
                  onChange={(_e, val) => { setSearch(val); setPage(1); setSelected(new Set()); }}
                  onClear={() => { setSearch(''); setPage(1); setSelected(new Set()); }}
                  aria-label="Search skills"
                  style={{ width: '320px' }}
                />
              </ToolbarItem>

              {/* Bulk action buttons — shown when items are selected */}
              {selected.size > 0 && (
                <>
                  <ToolbarItem>
                    <Button
                      variant="secondary"
                      icon={<SyncAltIcon />}
                      onClick={handleBulkSync}
                      isLoading={bulkSyncing}
                      isDisabled={bulkSyncing}
                    >
                      Sync
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant="danger"
                      icon={<TrashIcon />}
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  </ToolbarItem>
                </>
              )}

              <ToolbarItem align={{ default: 'alignEnd' }}>
                <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setAddOpen(true)}>
                  Register skill
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>

          {loading ? (
            <Table aria-label="Loading skills">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Install</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Tr key={i}>
                    <Td><Skeleton width="60%" /></Td>
                    <Td><Skeleton width="85%" /></Td>
                    <Td><Skeleton width="90%" /></Td>
                    <Td><Skeleton width="80px" /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : skills.length === 0 ? (
            <EmptyState headingLevel="h3" titleText={search ? 'No skills match your search' : 'No skills found'} icon={CubeIcon}>
              <EmptyStateBody>
                {search
                  ? `No skills matched "${search}".`
                  : 'Register a Git repository to start indexing skills.'}
              </EmptyStateBody>
              {!search && (
                <EmptyStateFooter>
                  <EmptyStateActions>
                    <Button variant="primary" icon={<PlusCircleIcon />} onClick={() => setAddOpen(true)}>
                      Register skill
                    </Button>
                  </EmptyStateActions>
                </EmptyStateFooter>
              )}
            </EmptyState>
          ) : (
            <Table aria-label={`Skills (${skills.length})`} style={{ tableLayout: 'fixed', width: '100%' }} isStriped>
              <Thead>
                <Tr>
                  <Th style={{ width: '40px' }} />
                  <Th
                    style={{ width: '18%' }}
                    sort={{ sortBy: { index: 0, direction: sortCol === 'name' ? sortDir : undefined }, onSort: () => handleSort('name'), columnIndex: 0 }}
                  >
                    Name
                  </Th>
                  <Th style={{ width: '28%' }}>Description</Th>
                  <Th style={{ width: '26%' }}>Install</Th>
                  <Th
                    style={{ width: '14%' }}
                    sort={{ sortBy: { index: 3, direction: sortCol === 'lastSynced' ? sortDir : undefined }, onSort: () => handleSort('lastSynced'), columnIndex: 3 }}
                  >
                    Last sync
                  </Th>
                  <Th style={{ width: '10%' }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pageSkills.map((skill) => {
                  const source = sources.find((s) => s.id === skill.sourceId);
                  return (
                    <Tr key={skill.id} isRowSelected={selected.has(skill.id)}>
                      <Td
                        select={{
                          rowIndex: pageSkills.indexOf(skill),
                          onSelect: (_e, checked) => handleSelectRow(skill.id, checked),
                          isSelected: selected.has(skill.id),
                        }}
                        style={{ verticalAlign: 'middle' }}
                      />
                      <Td dataLabel="Name" style={{ verticalAlign: 'middle' }}>
                        <strong>{skill.name}</strong>
                        {skill.category && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <Label color={categoryColor(skill.category)} isCompact>{skill.category}</Label>
                          </div>
                        )}
                      </Td>
                      <Td dataLabel="Description" style={{ verticalAlign: 'middle' }}>
                        {skill.description ? (
                          <Tooltip content={skill.description} isContentLeftAligned>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'default', lineHeight: 1.5 }}>
                              {skill.description}
                            </span>
                          </Tooltip>
                        ) : (
                          <Content component="small" style={{ color: 'var(--pf-t--global--color--nonstatus--gray--default)', fontStyle: 'italic' }}>
                            No description
                          </Content>
                        )}
                      </Td>
                      <Td dataLabel="Install" style={{ verticalAlign: 'middle', paddingInlineEnd: 'var(--pf-t--global--spacer--lg)' }}>
                        {skill.installCommand && <InstallCommand command={skill.installCommand} compact />}
                      </Td>
                      <Td dataLabel="Last sync" style={{ verticalAlign: 'middle' }}>
                        {source?.lastSynced ? (
                          <Tooltip content={new Date(source.lastSynced).toLocaleString()}>
                            <Content component="small" style={{ cursor: 'default', whiteSpace: 'nowrap' }}>
                              {relativeTime(source.lastSynced)}
                            </Content>
                          </Tooltip>
                        ) : (
                          <Content component="small" style={{ color: 'var(--pf-t--global--color--nonstatus--gray--default)', fontStyle: 'italic' }}>
                            Never
                          </Content>
                        )}
                      </Td>
                      <Td dataLabel="Actions" style={{ verticalAlign: 'middle', paddingInlineEnd: 0 }}>
                        <Flex gap={{ default: 'gapXs' }} flexWrap={{ default: 'nowrap' }} style={{ width: 'fit-content' }}>
                          <FlexItem>
                            <Tooltip content="Edit source">
                              <Button variant="plain" aria-label={`Edit source for ${skill.name}`} onClick={() => openEdit(skill)}
                                style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}>
                                <PencilAltIcon />
                              </Button>
                            </Tooltip>
                          </FlexItem>
                          <FlexItem>
                            <Tooltip content="Sync source">
                              <Button variant="plain" aria-label={`Sync ${skill.name}`} onClick={() => handleRowSync(skill)}
                                isDisabled={syncingId === skill.sourceId}
                                style={{ color: 'var(--pf-t--global--icon--color--subtle)' }}>
                                <SyncAltIcon style={{ animation: syncingId === skill.sourceId ? 'spin 1s linear infinite' : undefined }} />
                              </Button>
                            </Tooltip>
                          </FlexItem>
                          <FlexItem>
                            <Tooltip content="Delete skill">
                              <Button variant="plain" aria-label={`Delete ${skill.name}`} onClick={() => setDeleteTarget(skill)}
                                style={{ color: 'var(--pf-t--global--icon--color--status--danger--default)' }}>
                                <TrashIcon />
                              </Button>
                            </Tooltip>
                          </FlexItem>
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}

          {/* Pagination footer */}
          {!loading && skills.length > perPage && (
            <Pagination
              itemCount={skills.length}
              page={page}
              perPage={perPage}
              onSetPage={(_e, p) => { setPage(p); setSelected(new Set()); }}
              onPerPageSelect={(_e, pp) => { setPerPage(pp); setPage(1); setSelected(new Set()); }}
              perPageOptions={[{ title: '10', value: 10 }, { title: '20', value: 20 }, { title: '50', value: 50 }]}
              style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}
            />
          )}
        </PageSection>
      )}

      {/* Login modal */}
      <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} variant="small">
        <ModalHeader title="Sign in as admin" />
        <ModalBody>
          {loginError && <Alert variant="danger" title={loginError} style={{ marginBottom: '1rem' }} />}
          <Form>
            <FormGroup label="Admin token" isRequired fieldId="admin-token">
              <TextInput
                id="admin-token"
                type="password"
                value={loginInput}
                onChange={(_e, val) => setLoginInput(val)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin token…"
                autoFocus
              />
            </FormGroup>
          </Form>
          <Content component="p" style={{ marginTop: 'var(--pf-t--global--spacer--sm)', fontSize: '0.85em' }}>
            The default token (<code>rhess-admin</code>) is printed in the server startup logs. Set{' '}
            <code>ADMIN_TOKEN</code> env var to change it.
          </Content>
        </ModalBody>
        <ModalFooter>
          <ActionGroup>
            <Button variant="primary" onClick={handleLogin} isDisabled={!loginInput.trim()}>Sign in</Button>
            <Button variant="link" onClick={() => { setLoginOpen(false); setLoginInput(''); setLoginError(''); }}>Cancel</Button>
          </ActionGroup>
        </ModalFooter>
      </Modal>

      {/* Register source modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} variant="medium">
        <ModalHeader title="Register skill" />
        <ModalBody>
          {addError && <Alert variant="danger" title={addError} style={{ marginBottom: '1rem' }} />}
          <Form>
            <FormGroup label="Name" isRequired fieldId="source-label">
              <TextInput
                id="source-label"
                value={newLabel}
                onChange={(_e, val) => setNewLabel(val)}
                placeholder="e.g. OpenShift Deployment Skills"
                autoFocus
              />
              <FormHelperText><HelperText><HelperTextItem>A display name for this source</HelperTextItem></HelperText></FormHelperText>
            </FormGroup>
            <FormGroup label="Source" isRequired fieldId="source-path">
              <TextInput
                id="source-path"
                value={newPath}
                onChange={(_e, val) => setNewPath(val)}
                placeholder="e.g. redhat-developer/agent-skills or https://gitlab.com/redhat/skills"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    GitHub <code>org/repo</code>, full GitHub/GitLab URL, or local path. The server will clone it and discover all SKILL.md files.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ActionGroup>
            <Button variant="primary" onClick={handleAddSource} isLoading={addLoading} isDisabled={addLoading || !newPath.trim() || !newLabel.trim()}>
              {addLoading ? 'Registering…' : 'Register'}
            </Button>
            <Button variant="link" onClick={() => { setAddOpen(false); setNewPath(''); setNewLabel(''); setAddError(''); }}>Cancel</Button>
          </ActionGroup>
        </ModalFooter>
      </Modal>

      {/* Edit source modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} variant="medium">
        <ModalHeader title={`Edit source — "${editTarget?.label}"`} />
        <ModalBody>
          <Form>
            <FormGroup label="Name" isRequired fieldId="edit-label">
              <TextInput id="edit-label" value={editLabel} onChange={(_e, val) => setEditLabel(val)} autoFocus />
            </FormGroup>
            <FormGroup label="Source" isRequired fieldId="edit-path">
              <TextInput
                id="edit-path"
                value={editPath}
                onChange={(_e, val) => setEditPath(val)}
                placeholder="e.g. org/repo or https://gitlab.com/org/repo"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {editPath.trim() && buildSourceUrl(editPath.trim()) ? (
                      <>Resolves to: <a href={buildSourceUrl(editPath.trim())!} target="_blank" rel="noopener noreferrer">{buildSourceUrl(editPath.trim())}</a></>
                    ) : (
                      'GitHub org/repo, GitLab URL, or local path'
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <ActionGroup>
            <Button variant="primary" onClick={handleEditSave} isLoading={editSaving} isDisabled={editSaving || !editLabel.trim() || !editPath.trim()}>
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="link" onClick={() => setEditTarget(null)}>Cancel</Button>
          </ActionGroup>
        </ModalFooter>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} variant="small">
        <ModalHeader title={`Delete "${deleteTarget?.name}"?`} />
        <ModalBody>
          <Content component="p">
            This will remove the skill and its source from the catalog. The action cannot be undone.
          </Content>
        </ModalBody>
        <ModalFooter>
          <ActionGroup>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading} isDisabled={deleteLoading}>
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
            <Button variant="link" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          </ActionGroup>
        </ModalFooter>
      </Modal>

      {/* Bulk delete confirm modal */}
      <Modal isOpen={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} variant="small">
        <ModalHeader title={`Delete ${selected.size} skill${selected.size !== 1 ? 's' : ''}?`} />
        <ModalBody>
          <Content component="p">
            This will permanently delete the selected skills. This action cannot be undone.
          </Content>
        </ModalBody>
        <ModalFooter>
          <ActionGroup>
            <Button variant="danger" onClick={handleBulkDelete} isLoading={bulkDeleting} isDisabled={bulkDeleting}>
              {bulkDeleting ? 'Deleting…' : `Delete ${selected.size} skill${selected.size !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="link" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
          </ActionGroup>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default AdminPage;
