'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, 
  FileCode, 
  FileImage, 
  Upload, 
  Download,
  Trash2,
  HardDrive,
  Search,
  Volume2
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useToast, ToastProvider } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import Avatar from '@/components/ui/Avatar';

interface DriveFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploaderName: string;
  projectName: string;
  createdAt: string;
}

function FilesWorkspace() {
  const { success, error, info } = useToast();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
      }
    } catch (err) {
      console.error(err);
      error('Data Error', 'Failed to retrieve storage files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // File validation (10MB Limit)
    if (file.size > 10 * 1024 * 1024) {
      error('Limit Exceeded', 'Maximum file size limit is 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    info('Uploading file...', 'Please wait while transmitting data.');
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        success('Success', `File "${file.name}" uploaded successfully.`);
        fetchFiles();
      } else {
        error('Upload Failed', data.error || 'Failed to upload file.');
      }
    } catch (err) {
      console.error(err);
      error('System Error', 'Connection failed.');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage size={16} color="var(--success-color)" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <Volume2 size={16} color="var(--info-color)" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText size={16} color="var(--error-color)" />;
    }
    return <FileCode size={16} color="var(--text-muted)" />;
  };

  const getMimeLabel = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('audio/')) return 'Voice Note';
    if (mimeType.includes('pdf')) return 'PDF Document';
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) return 'Code Script';
    return 'Document';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalUsageBytes = files.reduce((acc, f) => acc + f.size, 0);

  // Group files into custom browser categories
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.uploaderName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory === 'Images') {
      matchesCategory = f.mimeType.startsWith('image/');
    } else if (selectedCategory === 'Documents') {
      matchesCategory = f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('sheet');
    } else if (selectedCategory === 'Audio') {
      matchesCategory = f.mimeType.startsWith('audio/');
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Storage Drive</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Access and upload shared document resources, voice notes, and project mockups.
          </p>
        </div>
        
        {/* Hidden File Picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleUploadFile}
        />
        
        <Button variant="primary" onClick={() => fileInputRef.current?.click()} style={{ gap: '6px' }}>
          <Upload size={14} />
          <span>Upload File</span>
        </Button>
      </div>

      {/* Categories & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card>
          <CardBody style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderRadius: 'var(--radius-sm)' }}>
              <HardDrive size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Drive Usage</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                {formatSize(totalUsageBytes)} of 10 GB
              </div>
            </div>
          </CardBody>
        </Card>

        {['Images', 'Documents', 'Audio'].map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <div 
              key={cat} 
              onClick={() => setSelectedCategory(isSelected ? 'All' : cat)}
              style={{ cursor: 'pointer' }}
            >
              <Card 
                style={{ 
                  borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                  backgroundColor: isSelected ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                }}
              >
                <CardBody style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cat}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Browse type</div>
                  </div>
                  <Badge variant={isSelected ? 'success' : 'info'}>
                    {isSelected ? 'Active Filter' : 'Browse'}
                  </Badge>
                </CardBody>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Main Files Table */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '380px' }}>
            <div className="header-search" style={{ width: '100%' }}>
              <Search className="header-search-icon" size={14} style={{ left: '10px' }} />
              <input 
                type="text" 
                placeholder="Search documents or uploaders..." 
                className="header-search-input"
                style={{ padding: '8px 12px 8px 32px', fontSize: '12px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {selectedCategory !== 'All' && (
            <Button variant="outline" size="sm" onClick={() => setSelectedCategory('All')}>
              Clear Filters
            </Button>
          )}
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px' }}><LoadingSpinner size={24} /></div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ padding: '40px' }}>
              <EmptyState
                icon={HardDrive}
                title="No Files Found"
                description="Try uploading a new file or modifying your category and search filters."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Scope Group</TableHead>
                  <TableHead>File Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getFileIcon(file.mimeType)}
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>{file.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{getMimeLabel(file.mimeType)}</Badge>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>{file.projectName}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatSize(file.size)}</TableCell>
                    <TableCell style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar name={file.uploaderName} size="sm" />
                      <span>{file.uploaderName}</span>
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" style={{ padding: '4px 8px' }}>
                          <Download size={12} />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
      
    </div>
  );
}

export default function FilesPage() {
  return (
    <ToastProvider>
      <FilesWorkspace />
    </ToastProvider>
  );
}
