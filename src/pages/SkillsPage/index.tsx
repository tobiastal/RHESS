import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Divider,
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
import { useNavigate } from 'react-router-dom';
import { getSkills, searchSkills } from '../../api/client';
import type { GetSkillsParams } from '../../api/client';
import type { Skill } from '../../api/types';
import InstallCommand from '../../components/InstallCommand';

const SKELETON_COUNT = 9;
const PER_PAGE_OPTIONS = [12, 24, 48];

type SortCol = 'name' | 'category' | 'lastModified';
type SortOrder = 'asc' | 'desc';

interface SortState { col: SortCol; order: SortOrder }

const COLUMN_SORT: Record<number, SortCol> = { 0: 'name' };

import { categoryColor } from '../../utils/category';

const SkillCard: React.FC<{ skill: Skill }> = ({ skill }) => {
  const navigate = useNavigate();
  const sourceUrl = skill.sourceUrl
    ? (skill.sourceUrl.startsWith('http') ? skill.sourceUrl : `https://github.com/${skill.sourceUrl}`)
    : null;

  return (
    <Card isFullHeight style={{ display: 'flex', flexDirection: 'column' }}>
      <CardTitle>
        <span style={{ fontWeight: 600 }}>{skill.name}</span>
        {skill.category && (
          <div style={{ marginTop: '0.35rem' }}>
            <Label color={categoryColor(skill.category)} isCompact>{skill.category}</Label>
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
          <Th style={{ width: '30%' }}>Install</Th>
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
  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0]);
  const [sort, setSort] = useState<SortState>({ col: 'name', order: 'asc' });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSkills = useCallback(async (
    q: string,
    pg: number,
    pp: number,
    s: SortState,
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (q.trim()) {
        const { skills: results, total: t } = await searchSkills(q.trim());
        setSkills(results);
        setTotal(t);
        setTotalPages(1);
      } else {
        const data = await getSkills({
          page: pg,
          per_page: pp,
          sort: s.col as GetSkillsParams['sort'],
          order: s.order,
        });
        setSkills(data.skills);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills('', page, perPage, sort);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      loadSkills(search, 1, perPage, sort);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search]); // eslint-disable-line

  const handlePageChange = (_e: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => {
    setPage(newPage);
    loadSkills(search, newPage, perPage, sort);
  };

  const handlePerPageChange = (_e: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
    loadSkills(search, 1, newPerPage, sort);
  };

  const handleSort = (col: SortCol, order: SortOrder) => {
    const next = { col, order };
    setSort(next);
    setPage(1);
    loadSkills(search, 1, perPage, next);
  };

  return (
    <>
      <PageSection variant={PageSectionVariants.secondary} isWidthLimited>
        <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Title headingLevel="h1" size="2xl" style={{ lineHeight: 1 }}>Skills</Title>
              {!loading && <Badge isRead>{total}</Badge>}
            </div>
            <Content component="p" style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}>
              Add reusable procedural knowledge to your AI agents with a single-command skill installation.
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection variant={PageSectionVariants.secondary} padding={{ default: 'noPadding' }}>
        <Divider />
      </PageSection>

      <PageSection variant={PageSectionVariants.default}>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Search skills…"
                value={search}
                onChange={(_e, val) => setSearch(val)}
                onClear={() => setSearch('')}
                aria-label="Search skills"
                style={{ width: '320px' }}
              />
            </ToolbarItem>
            <ToolbarItem align={{ default: 'alignEnd' }}>
              <ToggleGroup aria-label="View mode">
                <ToggleGroupItem icon={<ThListIcon />} aria-label="Table view" isSelected={viewMode === 'table'} onClick={() => setViewMode('table')} />
                <ToggleGroupItem icon={<ThIcon />} aria-label="Card view" isSelected={viewMode === 'card'} onClick={() => setViewMode('card')} />
              </ToggleGroup>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        {loading && (
          <Gallery hasGutter minWidths={{ default: '280px', md: '300px' }}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <GalleryItem key={i}>
                <Card isFullHeight>
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
                <Button variant="primary" onClick={() => loadSkills(search, page, perPage, sort)}>Retry</Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        )}

        {!loading && !error && skills.length === 0 && (
          <EmptyState headingLevel="h2" titleText={search ? 'No skills match your search' : 'No skills found'} icon={CubeIcon}>
            <EmptyStateBody>
              {search ? `No skills matched "${search}". Try a different search term.` : 'Add skill sources in the Admin section to get started.'}
            </EmptyStateBody>
            {search && (
              <EmptyStateFooter>
                <EmptyStateActions>
                  <Button variant="link" onClick={() => setSearch('')}>Clear search</Button>
                </EmptyStateActions>
              </EmptyStateFooter>
            )}
          </EmptyState>
        )}

        {!loading && !error && skills.length > 0 && viewMode === 'card' && (
          <Gallery hasGutter minWidths={{ default: '280px', md: '300px' }}>
            {skills.map((skill) => (
              <GalleryItem key={skill.id}><SkillCard skill={skill} /></GalleryItem>
            ))}
          </Gallery>
        )}

        {!loading && !error && skills.length > 0 && viewMode === 'table' && (
          <SkillsTable skills={skills} sort={sort} onSort={handleSort} />
        )}

        {!loading && !error && !search && totalPages > 1 && (
          <Pagination
            itemCount={total}
            perPage={perPage}
            page={page}
            onSetPage={handlePageChange}
            onPerPageSelect={handlePerPageChange}
            perPageOptions={PER_PAGE_OPTIONS.map((n) => ({ title: `${n}`, value: n }))}
            style={{ marginTop: 'var(--pf-t--global--spacer--lg)' }}
          />
        )}
      </PageSection>
    </>
  );
};

export default SkillsPage;
