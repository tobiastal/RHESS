import React, { useCallback, useEffect, useState } from 'react';
import {
  PageSection,
  PageSectionVariants,
  Title,
  Gallery,
  GalleryItem,
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Badge,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateActions,
  Skeleton,
  Tooltip,
  Content,
  Flex,
  FlexItem,
  ToggleGroup,
  ToggleGroupItem,
  Pagination,
  Label,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ThProps,
} from '@patternfly/react-table';
import { SearchIcon, CubeIcon, ThIcon, ThListIcon } from '@patternfly/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSkills } from '../../api/client';
import { useTheme } from '../../hooks/useTheme';
import type { Skill } from '../../api/types';
import InstallCommand from '../../components/InstallCommand';
import { categoryColor } from '../../utils/category';

const SKELETON_COUNT = 9;
const PER_PAGE_OPTIONS = [10, 20, 50, 100];

type SortCol = 'name' | 'category' | 'lastModified';
type SortOrder = 'asc' | 'desc';

interface SortState { col: SortCol; order: SortOrder }

const COLUMN_SORT: Record<number, SortCol> = { 0: 'name' };

const SkillCard: React.FC<{ skill: Skill }> = ({ skill }) => {
  const navigate = useNavigate();
  const sourceUrl = skill.sourceUrl
    ? (skill.sourceUrl.startsWith('http') ? skill.sourceUrl : `https://github.com/${skill.sourceUrl}`)
    : null;

  return (
    <Card isGlass isFullHeight style={{ display: 'flex', flexDirection: 'column' }}>
      <CardTitle>
        <span style={{ fontWeight: 600 }}>{skill.name}</span>
        {skill.category && (
          <div style={{ marginTop: '0.35rem' }}>
            <Label
              color={categoryColor(skill.category)}
              isCompact
              onClick={(e) => { e.stopPropagation(); navigate(`/skills?category=${encodeURIComponent(skill.category!)}`); }}
              style={{ cursor: 'pointer' }}
            >{skill.category}</Label>
          </div>
        )}
        {sourceUrl && (
          <div style={{ marginTop: '0.2rem' }}>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.75em', color: 'var(--pf-t--global--color--nonstatus--blue--default)' }}
            >
              {skill.sourceUrl}
            </a>
          </div>
        )}
      </CardTitle>
      <CardBody style={{ flex: 1 }}>
        {skill.description ? (
          <Tooltip content={skill.description} isContentLeftAligned>
            <Content component="p" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 'var(--pf-t--global--spacer--sm)', cursor: 'default' }}>
              {skill.description}
            </Content>
          </Tooltip>
        ) : (
          <Content component="p" style={{ color: 'var(--pf-t--global--color--nonstatus--gray--default)', fontStyle: 'italic', marginBottom: 'var(--pf-t--global--spacer--sm)' }}>
            No description provided.
          </Content>
        )}
      </CardBody>
      <CardBody><InstallCommand command={skill.installCommand} /></CardBody>
      <CardFooter>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/skills/${encodeURIComponent(skill.id)}`)}>
          View details
        </Button>
      </CardFooter>
    </Card>
  );
};

interface SkillsTableProps {
  skills: Skill[];
  sort: SortState;
  onSort: (col: SortCol, order: SortOrder) => void;
}

const SkillsTable: React.FC<SkillsTableProps> = ({ skills, sort, onSort }) => {
  const navigate = useNavigate();

  const getSortParams = (colIdx: number): ThProps['sort'] => {
    const col = COLUMN_SORT[colIdx];
    if (!col) return undefined;
    return {
      sortBy: {
        index: Object.entries(COLUMN_SORT).find(([, v]) => v === sort.col)?.[0] !== undefined
          ? Number(Object.entries(COLUMN_SORT).find(([, v]) => v === sort.col)![0])
          : 0,
        direction: sort.order,
      },
      onSort: (_e, _idx, direction) => {
        onSort(col, direction as SortOrder);
      },
      columnIndex: colIdx,
    };
  };

  return (
    <Table aria-label={`Skills (${skills.length})`} style={{ tableLayout: 'fixed', width: '100%' }} isStriped>
      <Thead>
        <Tr>
          <Th sort={getSortParams(0)} style={{ width: '22%' }}>Name</Th>
          <Th style={{ width: '36%' }}>Description</Th>
          <Th style={{ width: '30%' }}>Install command</Th>
          <Th style={{ width: '12%' }}>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {skills.map((skill) => (
          <Tr key={skill.id}>
            <Td dataLabel="Name" style={{ verticalAlign: 'middle' }}>
              <strong>{skill.name}</strong>
              {skill.category && (
                <div style={{ marginTop: '0.25rem' }}>
                  <Label
                    color={categoryColor(skill.category)}
                    isCompact
                    onClick={(e) => { e.stopPropagation(); navigate(`/skills?category=${encodeURIComponent(skill.category!)}`); }}
                    style={{ cursor: 'pointer' }}
                  >{skill.category}</Label>
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
            <Td dataLabel="Install command" style={{ verticalAlign: 'middle', paddingInlineEnd: 'var(--pf-t--global--spacer--lg)' }}>
              <InstallCommand command={skill.installCommand} compact />
            </Td>
            <Td dataLabel="Actions" style={{ verticalAlign: 'middle' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/skills/${encodeURIComponent(skill.id)}`)}>
                View details
              </Button>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

type ViewMode = 'card' | 'table';

const SkillsPage: React.FC = () => {
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const selectedCategory = searchParams.get('category');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0]);
  const [sort, setSort] = useState<SortState>({ col: 'name', order: 'asc' });

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSkills({ per_page: 200 });
      setAllSkills(data.skills);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSkills(); }, []); // eslint-disable-line

  // Derive unique categories from the full catalog
  const categories = [...new Set(allSkills.map((s) => s.category).filter(Boolean) as string[])].sort();

  // Client-side filter + sort
  const filteredSkills = allSkills
    .filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sort.order === 'asc' ? cmp : -cmp;
    });

  const totalFiltered = filteredSkills.length;
  const totalPages = Math.ceil(totalFiltered / perPage);
  const pageSkills = filteredSkills.slice((page - 1) * perPage, page * perPage);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleCategory = (cat: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (next.get('category') === cat) next.delete('category');
      else next.set('category', cat);
      return next;
    });
    setPage(1);
  };
  const handleSort = (col: SortCol, order: SortOrder) => { setSort({ col, order }); setPage(1); };

  return (
    <>
      {/* ── Hero search section ── */}
      <PageSection
        style={{
          paddingBlockStart: 'var(--pf-t--global--spacer--lg)',
          paddingBlockEnd: 'var(--pf-t--global--spacer--2xl)',
          paddingInline: 'var(--pf-t--global--spacer--lg)',
        }}
      >
        {/* View toggle — flows to top-right, never overlaps card */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <ToggleGroup aria-label="View mode">
            <ToggleGroupItem icon={<ThListIcon />} aria-label="Table view" isSelected={viewMode === 'table'} onChange={() => setViewMode('table')} />
            <ToggleGroupItem icon={<ThIcon />} aria-label="Card view" isSelected={viewMode === 'card'} onChange={() => setViewMode('card')} />
          </ToggleGroup>
        </div>
        <Card isGlass style={{ maxWidth: '680px', margin: '0 auto', overflow: 'hidden' }}>
          <CardBody style={{ textAlign: 'center', padding: 'var(--pf-t--global--spacer--xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: 'var(--pf-t--global--spacer--xs)' }}>
              <Title headingLevel="h1" size="2xl">Skills</Title>
              {!loading && <Badge isRead>{totalFiltered}</Badge>}
            </div>
            <Content component="p" style={{ color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 'var(--pf-t--global--spacer--xl)' }}>
              Add reusable procedural knowledge to your AI agents with a single-command skill installation.
            </Content>

            <SearchInput
              placeholder="Search skills…"
              value={search}
              onChange={(_e, val) => handleSearch(val)}
              onClear={() => handleSearch('')}
              aria-label="Search skills"
              style={{ width: '100%', fontSize: '1rem' }}
            />

            {categories.length > 0 && (
              <div style={{ marginTop: 'var(--pf-t--global--spacer--lg)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {categories.map((cat) => (
                  <Label
                    key={cat}
                    color={categoryColor(cat)}
                    isCompact
                    onClick={() => handleCategory(cat)}
                    style={{
                      cursor: 'pointer',
                      opacity: selectedCategory && selectedCategory !== cat ? 0.45 : 1,
                      outline: selectedCategory === cat ? '2px solid var(--pf-t--global--border--color--status--info--default)' : undefined,
                      outlineOffset: '2px',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {cat}
                  </Label>
                ))}
              </div>
            )}

          </CardBody>
        </Card>
      </PageSection>

      {/* ── Table / Gallery section ── */}
      <PageSection
        variant={PageSectionVariants.default}
        style={{ paddingBlockStart: 0, paddingBlockEnd: 'var(--pf-t--global--spacer--md)', paddingInline: 'var(--pf-t--global--spacer--lg)' }}
      >

        {loading && (
          <Gallery hasGutter minWidths={{ default: '280px', md: '300px' }}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <GalleryItem key={i}>
                <Card isGlass isFullHeight>
                  <CardTitle><Skeleton width="60%" height="1.2rem" /></CardTitle>
                  <CardBody>
                    <Skeleton width="100%" height="0.9rem" style={{ marginBottom: '0.5rem' }} />
                    <Skeleton width="80%" height="0.9rem" style={{ marginBottom: '1rem' }} />
                    <Skeleton width="40%" height="1.4rem" />
                  </CardBody>
                  <CardFooter><Skeleton width="30%" height="2rem" /></CardFooter>
                </Card>
              </GalleryItem>
            ))}
          </Gallery>
        )}

        {!loading && error && (
          <EmptyState headingLevel="h2" titleText="Could not load skills" icon={SearchIcon}>
            <EmptyStateBody>{error} — make sure the RHESS server is running on port 3001.</EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={loadSkills}>Retry</Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        )}

        {!loading && !error && filteredSkills.length === 0 && (
          <EmptyState headingLevel="h2" titleText={search || selectedCategory ? 'No skills match your filters' : 'No skills found'} icon={CubeIcon}>
            <EmptyStateBody>
              {search || selectedCategory
                ? 'Try adjusting your search or clearing a category filter.'
                : 'Add skill sources in the Admin section to get started.'}
            </EmptyStateBody>
            {(search || selectedCategory) && (
              <EmptyStateFooter>
                <EmptyStateActions>
                  <Button variant="link" onClick={() => { handleSearch(''); setSearchParams({}); }}>Clear filters</Button>
                </EmptyStateActions>
              </EmptyStateFooter>
            )}
          </EmptyState>
        )}

        {!loading && !error && filteredSkills.length > 0 && viewMode === 'card' && (
          <Gallery hasGutter minWidths={{ default: '280px', md: '300px' }}>
            {pageSkills.map((skill) => (
              <GalleryItem key={skill.id}><SkillCard skill={skill} /></GalleryItem>
            ))}
          </Gallery>
        )}

        {!loading && !error && filteredSkills.length > 0 && viewMode === 'table' && (
          <Card>
            <SkillsTable skills={pageSkills} sort={sort} onSort={handleSort} />
          </Card>
        )}

        {!loading && !error && totalFiltered > 0 && (
          <Pagination
            itemCount={totalFiltered}
            perPage={perPage}
            page={page}
            onSetPage={(_e, p) => setPage(p)}
            onPerPageSelect={(_e, pp) => { setPerPage(pp); setPage(1); }}
            perPageOptions={PER_PAGE_OPTIONS.map((n) => ({ title: `${n}`, value: n }))}
            style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}
          />
        )}
      </PageSection>
    </>
  );
};

export default SkillsPage;
