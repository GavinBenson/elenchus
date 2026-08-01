// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Card } from './Card'
import { Table, Th, Td } from './Table'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

describe('primitives forward data-testid', () => {
  it('Button, Input, Select, Card each forward it', () => {
    render(
      <div>
        <Button data-testid="btn">Go</Button>
        <Input data-testid="inp" />
        <Select data-testid="sel">
          <option>a</option>
        </Select>
        <Card data-testid="card">body</Card>
      </div>
    )
    for (const id of ['btn', 'inp', 'sel', 'card']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }
  })
})

describe('Button', () => {
  it('passes through native button attributes', () => {
    render(
      <Button data-testid="btn" disabled type="submit">
        Save
      </Button>
    )
    const btn = screen.getByTestId('btn')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('type', 'submit')
  })

  it('renders visually distinct primary and secondary variants', () => {
    const { unmount } = render(<Button data-testid="b" variant="primary">P</Button>)
    const primary = screen.getByTestId('b').className
    unmount()
    render(<Button data-testid="b" variant="secondary">S</Button>)
    expect(screen.getByTestId('b').className).not.toBe(primary)
  })
})

describe('Table', () => {
  it('composes into a real table structure', () => {
    render(
      <Table data-testid="tbl">
        <thead>
          <tr>
            <Th>Name</Th>
          </tr>
        </thead>
        <tbody data-testid="rows">
          <tr>
            <Td>Dana</Td>
          </tr>
        </tbody>
      </Table>
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader')).toHaveTextContent('Name')
    expect(screen.getByRole('cell')).toHaveTextContent('Dana')
    // The row container carries its own id so list assertions can count rows.
    expect(screen.getByTestId('rows')).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders title, optional subtitle, and optional actions', () => {
    render(
      <PageHeader
        title="Applicants"
        subtitle="46 candidates"
        actions={<Button data-testid="action">Add</Button>}
      />
    )
    expect(screen.getByRole('heading', { name: 'Applicants' })).toBeInTheDocument()
    expect(screen.getByText('46 candidates')).toBeInTheDocument()
    expect(screen.getByTestId('action')).toBeInTheDocument()
  })

  it('omits the subtitle element entirely when not given one', () => {
    render(<PageHeader title="Employees" />)
    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.queryByTestId('page-subtitle')).not.toBeInTheDocument()
  })
})

describe('EmptyState and Skeleton', () => {
  it('EmptyState renders its title and message', () => {
    render(<EmptyState title="No applicants" message="Nobody has applied yet." data-testid="empty" />)
    expect(screen.getByTestId('empty')).toHaveTextContent('No applicants')
    expect(screen.getByTestId('empty')).toHaveTextContent('Nobody has applied yet.')
  })

  it('Skeleton renders the requested number of placeholder rows', () => {
    render(<Skeleton rows={4} data-testid="skel" />)
    expect(screen.getByTestId('skel').children).toHaveLength(4)
  })

  it('Skeleton defaults to a sensible number of rows', () => {
    render(<Skeleton data-testid="skel" />)
    expect(screen.getByTestId('skel').children.length).toBeGreaterThan(0)
  })
})
