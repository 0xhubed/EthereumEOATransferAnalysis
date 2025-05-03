import React, { useState, useEffect } from 'react';
import { 
  getSavedSearches, 
  deleteSavedSearch, 
  addSearchTags, 
  removeSearchTag, 
  updateSearchNotes,
  getAllSearchTags
} from '../services/alchemyService';
import './SavedSearches.css';
import { Input } from './ui/input';
import { Button } from './ui/button';

const SavedSearches = ({ onSelectSearch, onClose }) => {
  const [searches, setSearches] = useState([]);
  const [filteredSearches, setFilteredSearches] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortOrder, setSortOrder] = useState('date');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Load all saved searches
    loadSearches();
  }, []);

  const loadSearches = () => {
    const allSearches = getSavedSearches();
    setSearches(allSearches);
    setFilteredSearches(allSearches);
    setAllTags(getAllSearchTags());
  };

  useEffect(() => {
    // Apply filters when search filter or selected tags change
    applyFilters();
  }, [searchFilter, selectedTags, searches, sortOrder]);

  const applyFilters = () => {
    let filtered = [...searches];

    // Apply text search filter
    if (searchFilter) {
      filtered = filtered.filter(search => 
        search.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        search.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (search.notes && search.notes.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter(search => 
        selectedTags.every(tag => search.tags && search.tags.includes(tag))
      );
    }

    // Apply sorting
    if (sortOrder === 'date') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortOrder === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'address') {
      filtered.sort((a, b) => a.address.localeCompare(b.address));
    }

    setFilteredSearches(filtered);
  };

  const handleSearchFilterChange = (e) => {
    setSearchFilter(e.target.value);
  };

  const handleSelectSearch = (search) => {
    setSelectedSearch(search);
    setNotes(search.notes || '');
    setIsEditMode(false);
  };

  const handleLoadSearch = () => {
    if (selectedSearch && onSelectSearch) {
      onSelectSearch(selectedSearch);
    }
  };

  const handleDeleteSearch = (searchId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved search?')) {
      deleteSavedSearch(searchId);
      if (selectedSearch && selectedSearch.id === searchId) {
        setSelectedSearch(null);
      }
      loadSearches();
    }
  };

  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && selectedSearch) {
      addSearchTags(selectedSearch.id, [newTag.trim()]);
      loadSearches();
      // Update the selected search to show the new tag
      const updatedSearch = getSavedSearches().find(s => s.id === selectedSearch.id);
      if (updatedSearch) {
        setSelectedSearch(updatedSearch);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag, e) => {
    e.stopPropagation();
    if (selectedSearch) {
      removeSearchTag(selectedSearch.id, tag);
      loadSearches();
      // Update the selected search to reflect the removed tag
      const updatedSearch = getSavedSearches().find(s => s.id === selectedSearch.id);
      if (updatedSearch) {
        setSelectedSearch(updatedSearch);
      }
    }
  };

  const handleSaveNotes = () => {
    if (selectedSearch) {
      updateSearchNotes(selectedSearch.id, notes);
      // Update the selected search to reflect the new notes
      const updatedSearch = getSavedSearches().find(s => s.id === selectedSearch.id);
      if (updatedSearch) {
        setSelectedSearch(updatedSearch);
      }
      setIsEditMode(false);
      loadSearches();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getTimeFilterString = (timeFilter) => {
    if (!timeFilter) return 'None';
    
    let filterStr = '';
    if (timeFilter.startBlock) filterStr += `From block: ${timeFilter.startBlock} `;
    if (timeFilter.endBlock) filterStr += `To block: ${timeFilter.endBlock}`;
    
    return filterStr || 'None';
  };

  return (
    <div className="saved-searches-manager">
      <div className="searches-header">
        <h2>Saved Searches</h2>
        <Button 
          onClick={onClose}
          variant="outline"
          size="sm"
          className="close-button"
        >
          Close
        </Button>
      </div>

      <div className="search-panel">
        <div className="search-controls">
          <Input
            type="text"
            placeholder="Filter searches by name, address or notes..."
            value={searchFilter}
            onChange={handleSearchFilterChange}
            className="search-filter"
          />
          
          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="sort-select"
            >
              <option value="date">Date (newest first)</option>
              <option value="name">Name</option>
              <option value="address">Address</option>
            </select>
          </div>
        </div>

        <div className="tag-filters">
          <span className="filter-label">Filter by tags:</span>
          <div className="tag-list">
            {allTags.map(tag => (
              <span 
                key={tag} 
                className={`filter-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </span>
            ))}
            {allTags.length === 0 && <span className="no-tags">No tags available</span>}
          </div>
        </div>
      </div>

      <div className="searches-container">
        <div className="searches-list">
          {filteredSearches.length === 0 ? (
            <div className="no-searches">
              <p>No saved searches match your filters</p>
            </div>
          ) : (
            filteredSearches.map(search => (
              <div 
                key={search.id} 
                className={`search-item ${selectedSearch && selectedSearch.id === search.id ? 'selected' : ''}`}
                onClick={() => handleSelectSearch(search)}
              >
                <div className="search-item-header">
                  <h3>{search.name}</h3>
                  <Button
                    onClick={(e) => handleDeleteSearch(search.id, e)}
                    variant="outline"
                    size="sm"
                    className="delete-button"
                  >
                    Delete
                  </Button>
                </div>
                <div className="search-item-address">{search.address}</div>
                <div className="search-item-meta">
                  <span className="search-date">{formatDate(search.date)}</span>
                  {search.tags && search.tags.length > 0 && (
                    <div className="search-tags">
                      {search.tags.map(tag => (
                        <span key={tag} className="search-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="search-details">
          {selectedSearch ? (
            <>
              <div className="details-header">
                <h3>{selectedSearch.name}</h3>
                <Button
                  onClick={handleLoadSearch}
                  variant="default"
                  size="sm"
                >
                  Load This Search
                </Button>
              </div>

              <div className="details-info">
                <div className="info-row">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{selectedSearch.address}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Date Saved:</span>
                  <span className="info-value">{formatDate(selectedSearch.date)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Time Filter:</span>
                  <span className="info-value">{getTimeFilterString(selectedSearch.timeFilter)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Visualization:</span>
                  <span className="info-value">{selectedSearch.visualizationMode || 'Standard'}</span>
                </div>
              </div>

              <div className="details-tags">
                <h4>Tags</h4>
                <div className="tags-container">
                  {selectedSearch.tags && selectedSearch.tags.length > 0 ? (
                    <div className="search-detail-tags">
                      {selectedSearch.tags.map(tag => (
                        <span key={tag} className="detail-tag">
                          {tag}
                          <button 
                            className="remove-tag" 
                            onClick={(e) => handleRemoveTag(tag, e)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="no-tags">No tags added</p>
                  )}
                </div>
                <div className="add-tag">
                  <Input
                    type="text"
                    placeholder="Add new tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="tag-input"
                  />
                  <Button
                    onClick={handleAddTag}
                    variant="outline"
                    size="sm"
                    disabled={!newTag.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="details-notes">
                <div className="notes-header">
                  <h4>Notes</h4>
                  <Button
                    onClick={() => setIsEditMode(!isEditMode)}
                    variant="outline"
                    size="sm"
                  >
                    {isEditMode ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                
                {isEditMode ? (
                  <div className="edit-notes">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this search..."
                      rows={5}
                      className="notes-textarea"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      variant="default"
                      size="sm"
                      className="save-notes"
                    >
                      Save Notes
                    </Button>
                  </div>
                ) : (
                  <div className="notes-content">
                    {selectedSearch.notes ? (
                      <p>{selectedSearch.notes}</p>
                    ) : (
                      <p className="no-notes">No notes added</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a search to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedSearches;