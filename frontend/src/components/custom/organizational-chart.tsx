import React, { cloneElement } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { flattenArray } from '@/utils/helper';

export type OrgChartProps<T> = {
  data: {
    children: any[];
    [key: string]: any;
  };
  nodeItem: (props: T) => React.ReactElement;
  [key: string]: any;
};

export type OrgChartListProps<T> = {
  data: any;
  depth: number;
  nodeItem: (props: T) => React.ReactElement;
};

export type OrgChartSubListProps<T> = {
  data: any[];
  depth: number;
  nodeItem: (props: T) => React.ReactElement;
};

export function OrganizationalChart<T>({ data, nodeItem, ...other }: OrgChartProps<T>) {
  const cloneNode = (props: T) => cloneElement(nodeItem(props));

  const label = cloneNode({ ...data } as T);

  return (
    <Tree
      lineWidth="1.5px"
      nodePadding="4px"
      lineBorderRadius="24px"
      lineColor="hsl(var(--border))"
      label={label}
      {...other}
    >
      {data.children.map((list, index) => (
        <TreeList key={index} depth={1} data={list} nodeItem={nodeItem} />
      ))}
    </Tree>
  );
}

export function TreeList<T>({ data, depth, nodeItem }: OrgChartListProps<T>) {
  const childs = (data as any).children;

  const cloneNode = (props: T) => cloneElement(nodeItem(props));
  const totalChildren = childs ? flattenArray(childs)?.length : 0;
  const label = cloneNode({ ...data, depth, totalChildren } as T);

  return (
    <TreeNode label={label}>
      {childs && <TreeSubList data={childs} depth={depth} nodeItem={nodeItem} />}
    </TreeNode>
  );
}

function TreeSubList<T>({ data, depth, nodeItem }: OrgChartSubListProps<T>) {
  return (
    <>
      {data.map((list, index) => (
        <TreeList key={index} data={list} depth={depth + 1} nodeItem={nodeItem} />
      ))}
    </>
  );
}
