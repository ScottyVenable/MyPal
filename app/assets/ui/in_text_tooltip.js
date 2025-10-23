import React from 'react';
import styled from 'styled-components';

const Tooltip = () => {
  return (
    <StyledWrapper>
      <div className="main-container">
        <p>This is some</p>
        <div className="tooltip-container">
          <span className="tooltip">Hello!</span>
          <div className="text">important</div>
          <p>stuff!</p>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .main-container {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 1em;
    color: #aaa;
    height: 150px;
    width: 300px;
  }

  .main-container:hover {
    .text {
      color: #cda8d6;
    }
  }

  .tooltip-container {
    --background: #750292;
    position: relative;
    cursor: pointer;
    display: flex;
    transition: all 0.2s;
    padding: 0 0.2em;
    border: 1px solid transparent;
  }

  .tooltip {
    position: absolute;
    top: 20px;
    left: 32%;
    transform: translateX(-50%);
    padding: 0.3em 0.6em;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s;
    color: #fff;
    background: var(--background);
  }

  .tooltip::before {
    position: absolute;
    content: "";
    height: 0.6em;
    width: 0.6em;
    bottom: -0.2em;
    left: 50%;
    transform: translate(-20%) rotate(45deg);
    background: var(--background);
  }

  .tooltip-container:hover .tooltip {
    top: -150%;
    border-radius: 0.25em;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .text {
    margin-right: 4px;
    height: fit-content;
    animation: 1s bounce infinite;
    border-bottom: 2px solid var(--background);
  }

  .text:hover {
    animation: none;
  }

  @keyframes bounce {
    50% {
      color: #cda8d6;
    }
    75% {
      scale: 0.98;
      transform: rotate(1deg);
    }
    100% {
      scale: 1.01;
    }
  }`;

export default Tooltip;

// Link: https://uiverse.io/mihocsaszilard/nice-dodo-30