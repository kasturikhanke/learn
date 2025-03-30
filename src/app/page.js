'use client';
import { useState, useRef } from "react";

export default function Home() {
  const [draggableItems, setDraggableItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeItem, setActiveItem] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [customFruits, setCustomFruits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const defaultFruits = [
    "🏥 Health",
    "💻 Technology",
    "📚 Education",
    "🎨 Art",
    "🧠 Psychology"
  ];

  const handleMouseDown = (e, item, isFromSidebar = false) => {
    setIsDragging(true);
    setIsNewItem(isFromSidebar);
    setActiveItem(isFromSidebar ? {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      text: item,
      position: { x: e.clientX, y: e.clientY }
    } : item);
    
    setDragOffset({
      x: e.clientX - (isFromSidebar ? e.clientX : item.position.x),
      y: e.clientY - (isFromSidebar ? e.clientY : item.position.y)
    });
  };

  const handleMouseMove = async (e) => {
    if (isDragging && activeItem) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };

      if (isNewItem) {
        setActiveItem(prev => ({
          ...prev,
          position: newPosition
        }));
      } else {
        setDraggableItems(items =>
          items.map(item =>
            item.id === activeItem.id
              ? { ...item, position: newPosition }
              : item
          )
        );
      }
    }
  };

  const checkOverlap = (item1, item2) => {
    // Get the dimensions of the items (assuming they're roughly 100x50 pixels based on padding)
    const itemWidth = 100;
    const itemHeight = 50;
    
    // Calculate the bounds of both items
    const item1Bounds = {
      left: item1.position.x,
      right: item1.position.x + itemWidth,
      top: item1.position.y,
      bottom: item1.position.y + itemHeight
    };
    
    const item2Bounds = {
      left: item2.position.x,
      right: item2.position.x + itemWidth,
      top: item2.position.y,
      bottom: item2.position.y + itemHeight
    };
    
    // Check if the rectangles overlap
    return !(item1Bounds.right < item2Bounds.left || 
             item1Bounds.left > item2Bounds.right || 
             item1Bounds.bottom < item2Bounds.top || 
             item1Bounds.top > item2Bounds.bottom);
  };

  const getAIResponse = async (item1Text, item2Text) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/replicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item1: item1Text,
          item2: item2Text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      console.log('Replicate API Response:', data);
      
      setAiResponse(data.response || 'No response from AI');
      return data.response;
    } catch (error) {
      console.error("Error getting AI response:", error);
      const fallbackResponse = "Failed to get AI response. Please try again.";
      setAiResponse(fallbackResponse);
      return JSON.stringify({ name: `${item1Text} + ${item2Text}` }); // Fallback combination
    } finally {
      setIsLoading(false);
    }
  };

  const combineItems = async (item1, item2) => {
    const combinedText = `${item1.text} + ${item2.text}`;
    const newPosition = isDragging ? item1.position : item2.position;
    const newId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    let newName = combinedText; // default fallback
    try {
      const response = await getAIResponse(item1.text, item2.text);
      try {
        const parsedResponse = JSON.parse(response);
        if (parsedResponse.name) {
          newName = parsedResponse.name;
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // Use the combined text as fallback if parsing fails
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Use the combined text as fallback if API call fails
    }
    
    const newItem = {
      id: newId,
      text: newName,
      position: newPosition,
      isNew: true,
      aiResponse: ""
    };

    // Add to custom fruits list with the new name
    if (!customFruits.some(fruit => fruit.text === newName)) {
      setCustomFruits(prev => [...prev, { 
        text: newName, 
        id: newId 
      }]);
    }

    return newItem;
  };

  const handleMouseUp = async (e) => {
    if (isDragging && activeItem) {
      const sidebarElement = document.querySelector('.w-64');
      const isInSidebar = sidebarElement.contains(e.target);
      
      if (!isInSidebar) {
        if (isNewItem) {
          const overlappingItem = draggableItems.find(item => 
            checkOverlap({ ...activeItem, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }, item)
          );

          if (overlappingItem) {
            const newItem = await combineItems(overlappingItem, activeItem);
            setDraggableItems(prev => [
              ...prev.filter(item => item.id !== overlappingItem.id),
              newItem
            ]);
          } else {
            setDraggableItems(prev => [...prev, activeItem]);
          }
        } else {
          const overlappingItem = draggableItems.find(item => 
            item.id !== activeItem.id && checkOverlap(
              { ...activeItem, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }, 
              item
            )
          );

          if (overlappingItem) {
            const newItem = await combineItems(overlappingItem, activeItem);
            setDraggableItems(prev => [
              ...prev.filter(item => 
                item.id !== overlappingItem.id && item.id !== activeItem.id
              ),
              newItem
            ]);
          }
        }
      }
    }
    
    setIsDragging(false);
    setActiveItem(null);
    setIsNewItem(false);
  };

  const handleLearnClick = (item) => {
    setSelectedCombination(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCombination(null);
  };

  return (
    <div className="flex h-screen">
      <div 
        className="flex-1 bg-gray-100 relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Canvas items */}
        {draggableItems.map((item) => (
          <div 
            key={item.id}
            className="absolute cursor-move select-none bg-white p-4 rounded shadow-lg"
            style={{
              left: item.position?.x ? `${item.position.x}px` : '0px',
              top: item.position?.y ? `${item.position.y}px` : '0px',
              height: '60px',
              width: '200px',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseDown={(e) => handleMouseDown(e, item, false)}
          >
            <div className="font-bold text-black">{item.text}</div>
            {item.aiResponse && (
              <div className="text-sm text-black mt-2">
                {item.aiResponse}
              </div>
            )}
          </div>
        ))}
        {/* Preview of new item being dragged */}
        {isDragging && isNewItem && activeItem && (
          <div 
            className="absolute cursor-move select-none bg-white p-4 rounded shadow-lg opacity-90"
            style={{
              left: `${activeItem.position.x}px`,
              top: `${activeItem.position.y}px`,
              height: '60px',
              width: '200px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <div className="font-bold text-black">{activeItem.text}</div>
          </div>
        )}
      </div>

      {/* Fruit list sidebar */}
      <div 
        className="w-64 bg-white text-black p-4 shadow-lg"
        onMouseUp={handleMouseUp}
      >
        <h2 className="text-lg font-bold mb-4">Categories</h2>
        <ul className="space-y-2">
          {defaultFruits.map((fruit, index) => (
            <li 
              key={index}
              className="p-2 bg-gray-800 rounded cursor-move hover:bg-black/80 transition-colors select-none text-white"
              style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseDown={(e) => handleMouseDown(e, fruit, true)}
            >
              {fruit}
            </li>
          ))}
          
          {customFruits.length > 0 && (
            <>
              <li className="mt-4 mb-2 text-sm font-semibold text-gray-500">Custom Combinations</li>
              {customFruits.map((fruit) => (
                <li 
                  key={fruit.id}
                  className="p-2 bg-gray-800 rounded cursor-move hover:bg-gray-100 transition-colors select-none text-white relative"
                  onMouseDown={(e) => {
                    if (!e.target.closest('button')) {
                      handleMouseDown(e, fruit.text, true);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{fruit.text}</span>
                    <button
                      className="ml-2 bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                      onClick={() => handleLearnClick({ text: fruit.text })}
                    >
                      Learn
                    </button>
                  </div>
                  <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>

      {/* Add the Modal */}
      {isModalOpen && selectedCombination && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Interdisciplinary Connection</h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <p className="text-lg mb-2">{selectedCombination.text}</p>
              {isLoading ? (
                <div className="text-center py-4">
                  <p>Loading AI response...</p>
                </div>
              ) : (
                <div className="text-gray-600">
                  <p className="whitespace-pre-wrap">{aiResponse}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleCloseModal}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
