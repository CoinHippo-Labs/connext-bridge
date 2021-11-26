import { useState, useEffect, forwardRef, useRef } from 'react'

import { useTable, useSortBy, usePagination, useRowSelect } from 'react-table'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

import { PageWithText, Pagination } from '../pagination'

const IndeterminateCheckbox = forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = useRef()
  const resolvedRef = ref || defaultRef

  useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate
  }, [resolvedRef, indeterminate])

  return (
    <input
      ref={resolvedRef}
      type="checkbox"
      {...rest}
      className="form-checkbox w-4 h-4"
    />
  )
})

export default function Datatable({ columns, data, rowSelectEnable = false, noPagination = false, defaultPageSize = 10, className = '' }) {
  const tableRef = useRef()

  const {
    getTableProps,
    getTableBodyProps,
    rows,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, selectedRowIds }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: defaultPageSize },
      disableSortRemove: true,
      stateReducer: (newState, action, prevState) => action.type.startsWith('reset') ? prevState : newState,
    },
    useSortBy,
    /*noPagination ? false : */usePagination,
    useRowSelect,
    hooks => {
      hooks.visibleColumns.push(columns => [
        rowSelectEnable ? {
          id: 'selection',
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <IndeterminateCheckbox { ...getToggleAllRowsSelectedProps() } />
          ),
          Cell: ({ row }) => (
            <IndeterminateCheckbox { ...row.getToggleRowSelectedProps() } />
          )
        } : undefined,
        ...columns
      ].filter(column => column))
    }
  )

  useEffect(() => {
    if (pageIndex + 1 > pageCount) {
      gotoPage(pageCount - 1)
    }
  }, [pageIndex, pageCount])

  const loading = data && data.findIndex(item => item.skeleton) > -1 ? true : false

  return (
    <>
      <table ref={tableRef} { ...getTableProps() } className={`table ${className}`}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr { ...headerGroup.getHeaderGroupProps() }>
              {headerGroup.headers.map(column => (
                <th { ...column.getHeaderProps(column.getSortByToggleProps()) } className={column.className}>
                  <div className={`flex flex-row items-center ${column.headerClassName && column.headerClassName.includes('justify-') ? '' : 'justify-start'} ${column.headerClassName || ''}`}>
                    <span>{column.render('Header')}</span>
                    <span className={`ml-${column.isSorted ? 2 : 0}`}>
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <FiChevronDown className="stroke-current text-2xs" />
                        ) : (
                          <FiChevronUp className="stroke-current text-2xs" />
                        )
                      ) : (
                        ''
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody { ...getTableBodyProps() }>
          {(noPagination ? rows : page).map((row, i) => {
            prepareRow(row)
            return (
              <tr { ...row.getRowProps() }>
                {row.cells.map((cell, j) => (<td { ...cell.getCellProps() } className={headerGroups[0] && headerGroups[0].headers[j] && headerGroups[0].headers[j].className}>{cell.render('Cell')}</td>))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!noPagination && data && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between my-4 mx-3">
          <select
            disabled={loading}
            value={pageSize}
            onChange={event => setPageSize(Number(event.target.value))}
            className="form-select dark:bg-gray-800 outline-none border-gray-200 dark:border-gray-800 shadow-none focus:shadow-none text-xs"
          >
            {[10, 25, 50, 100].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
          {pageCount <= 4 && (
            <span className="my-2 sm:my-0">
              Page <span className="font-bold">{pageIndex + 1}</span> of <span className="font-bold">{pageOptions.length}</span>
            </span>
          )}
          <div className="pagination flex flex-wrap items-center justify-end">
            {pageCount > 4 ?
              <div className="flex flex-col sm:flex-row items-center justify-center mt-2 sm:mt-0">
                <Pagination
                  items={[...Array(pageCount).keys()]}
                  disabled={loading}
                  active={pageIndex + 1}
                  previous="Previous"
                  next="Next"
                  onClick={_page => {
                    gotoPage(_page - 1)
                    tableRef.current.scrollIntoView() 
                  }}
                />
              </div>
              :
              <>
                {pageIndex !== 0 && (
                  <PageWithText
                    disabled={loading}
                    onClick={() => {
                      gotoPage(0)
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    First
                  </PageWithText>
                )}
                {canPreviousPage && (
                  <PageWithText
                    disabled={loading}
                    onClick={() => {
                      previousPage()
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Previous
                  </PageWithText>
                )}
                {canNextPage && (
                  <PageWithText
                    disabled={!canNextPage || loading}
                    onClick={() => {
                      nextPage()
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Next
                  </PageWithText>
                )}
                {pageIndex !== pageCount - 1 && (
                  <PageWithText
                    disabled={!canNextPage || loading}
                    onClick={() => {
                      gotoPage(pageCount - 1)
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Last
                  </PageWithText>
                )}
              </>
            }
          </div>
        </div>
      )}
    </>
  )
}